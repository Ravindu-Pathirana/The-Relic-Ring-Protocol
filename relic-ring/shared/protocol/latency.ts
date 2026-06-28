/**
 * Physics-based latency calculations for the Relic Ring Protocol.
 *
 * All distances are in kilometres. All latencies are in milliseconds.
 */

import type { PlanetNode } from '../types/universe';

/**
 * Calculate the void (interplanetary space) distance between two planets.
 *
 * Formula:  L = sqrt((x2-x1)^2 + (y2-y1)^2) * S - (R1 + h1) - (R2 + h2)
 *
 * The scale unit converts coordinate-space distance to km, then we subtract
 * each planet's radius and atmosphere thickness since the signal only
 * traverses open void between the outer edges of their atmospheres.
 *
 * @param p1 - Source planet
 * @param p2 - Destination planet
 * @param scaleUnit - Km per coordinate unit
 * @returns Void distance in km (clamped to >= 0)
 */
export function calculateVoidDistance(
  p1: PlanetNode,
  p2: PlanetNode,
  scaleUnit: number,
): number {
  const dx: number = p2.x - p1.x;
  const dy: number = p2.y - p1.y;
  const coordDist: number = Math.sqrt(dx * dx + dy * dy);
  const rawKm: number =
    coordDist * scaleUnit -
    (p1.radius_km + p1.atmosphere_thickness_km) -
    (p2.radius_km + p2.atmosphere_thickness_km);
  return Math.max(0, rawKm);
}

/**
 * Calculate the void travel time between two planets.
 *
 * Formula:  Tv = ((h1 * n1) + (h2 * n2) + L) / c
 *
 * Atmospheric thickness is scaled by the refraction index to account for
 * signal slowdown inside each atmosphere. The result is converted from
 * seconds to milliseconds.
 *
 * @param p1 - Source planet
 * @param p2 - Destination planet
 * @param L  - Void distance in km (from calculateVoidDistance)
 * @param c  - Speed of light in km/s
 * @returns Travel time in milliseconds
 */
export function calculateVoidTravelTime(
  p1: PlanetNode,
  p2: PlanetNode,
  L: number,
  c: number,
): number {
  const atmosphericPath: number =
    p1.atmosphere_thickness_km * p1.refraction_index +
    p2.atmosphere_thickness_km * p2.refraction_index;
  const totalDistKm: number = atmosphericPath + L;
  const seconds: number = totalDistKm / c;
  return seconds * 1000;
}

/**
 * Calculate the fiber optic transit time across a planet's surface ring.
 *
 * Formula:  Tp = (2 * pi * r * s) / (N * f * C) + m * deltaT
 *
 *   r        = planet radius in km
 *   s        = number of fiber segments between entry and exit tower
 *   N        = total number of towers on the planet
 *   f        = fiber speed fraction (relative to c)
 *   C        = speed of light in km/s
 *   m        = number of towers the signal passes through (s + 1, or 1 if s = 0)
 *   deltaT   = per-tower processing delay in ms
 *
 * The fiber distance portion is converted from seconds to ms;
 * the tower delay is already in ms.
 *
 * @param radius - Planet radius in km
 * @param numTowers - Total active towers on the planet
 * @param segments - Number of fiber ring segments traversed
 * @param fiberFraction - Fiber speed as fraction of c
 * @param c - Speed of light in km/s
 * @param towerDelay - Per-tower processing delay in ms
 * @returns Fiber transit time in milliseconds
 */
export function calculateFiberTransitTime(
  radius: number,
  numTowers: number,
  segments: number,
  fiberFraction: number,
  c: number,
  towerDelay: number,
): number {
  if (numTowers <= 0) {
    return 0;
  }

  // Fiber distance: arc length of `segments` segments out of `numTowers` on the ring
  const circumference: number = 2 * Math.PI * radius;
  const fiberDistKm: number = (circumference * segments) / numTowers;
  const fiberSpeed: number = fiberFraction * c;
  const fiberTimeMs: number = (fiberDistKm / fiberSpeed) * 1000;

  // Tower processing: signal passes through m towers
  const m: number = segments === 0 ? 1 : segments + 1;
  const towerTimeMs: number = m * towerDelay;

  return fiberTimeMs + towerTimeMs;
}

/**
 * Find the pair of towers (one on each planet) that are closest to each other
 * in straight-line distance.
 *
 * Towers are placed at equal angular intervals starting from the positive
 * y-axis (top, 0 degrees) and proceeding clockwise.
 *
 * Tower i on a planet at (cx, cy) with radius r and N towers:
 *   angle_i = (2 * pi * i) / N        (0-indexed, clockwise from +y)
 *   tx_i    = cx + r * sin(angle_i)    (sin for clockwise-from-top)
 *   ty_i    = cy + r * cos(angle_i)    (cos for clockwise-from-top)
 *
 * Coordinates are in universe coordinate space (pre-scale).
 *
 * @param p1 - Source planet
 * @param p2 - Destination planet
 * @param scaleUnit - Km per coordinate unit (used to convert radius to coord space)
 * @returns Object with the 0-indexed tower indices on each planet
 */
export function findClosestTowerPair(
  p1: PlanetNode,
  p2: PlanetNode,
  scaleUnit: number,
): { tower1: number; tower2: number } {
  const r1Coord: number = p1.radius_km / scaleUnit;
  const r2Coord: number = p2.radius_km / scaleUnit;

  let bestDist: number = Infinity;
  let bestT1: number = 0;
  let bestT2: number = 0;

  for (let i = 0; i < p1.active_towers; i++) {
    const angle1: number = (2 * Math.PI * i) / p1.active_towers;
    const tx1: number = p1.x + r1Coord * Math.sin(angle1);
    const ty1: number = p1.y + r1Coord * Math.cos(angle1);

    for (let j = 0; j < p2.active_towers; j++) {
      const angle2: number = (2 * Math.PI * j) / p2.active_towers;
      const tx2: number = p2.x + r2Coord * Math.sin(angle2);
      const ty2: number = p2.y + r2Coord * Math.cos(angle2);

      const dx: number = tx2 - tx1;
      const dy: number = ty2 - ty1;
      const dist: number = dx * dx + dy * dy; // squared is fine for comparison

      if (dist < bestDist) {
        bestDist = dist;
        bestT1 = i;
        bestT2 = j;
      }
    }
  }

  return { tower1: bestT1, tower2: bestT2 };
}

/**
 * Calculate the shortest arc path (number of fiber segments) between two
 * towers on a planetary ring.
 *
 * Towers are arranged in a ring, so the shortest path is the minimum of
 * the clockwise and counter-clockwise distances.
 *
 * @param towerEntry - 0-indexed entry tower
 * @param towerExit - 0-indexed exit tower
 * @param totalTowers - Total number of towers on the ring
 * @returns Number of segments in the shortest arc path
 */
export function calculateSegmentsBetweenTowers(
  towerEntry: number,
  towerExit: number,
  totalTowers: number,
): number {
  if (totalTowers <= 0) {
    return 0;
  }
  const clockwise: number =
    (towerExit - towerEntry + totalTowers) % totalTowers;
  const counterClockwise: number = totalTowers - clockwise;
  return Math.min(clockwise, counterClockwise);
}
