import { universeService } from './universeService.js';
import type { PlanetNode, UniverseMetadata } from './universeService.js';

export interface RouteSegment {
  from_planet: string;
  to_planet: string;
  void_distance_km: number;
  void_latency_ms: number;
  feasible: boolean;
}

export interface Route {
  path: string[];
  segments: RouteSegment[];
  total_latency_ms: number;
  feasible: boolean;
}

export interface NetworkState {
  disabled_nodes: string[];
  disabled_links: [string, string][];
}

function calculateVoidDistance(p1: PlanetNode, p2: PlanetNode, scale: number): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const centerDist = Math.sqrt(dx * dx + dy * dy) * scale;
  const L = centerDist - (p1.radius_km + p1.atmosphere_thickness_km) - (p2.radius_km + p2.atmosphere_thickness_km);
  return Math.max(0, L);
}

function calculateVoidTravelTime(p1: PlanetNode, p2: PlanetNode, L: number, c: number): number {
  const atmosphericPath = (p1.atmosphere_thickness_km * p1.refraction_index) + (p2.atmosphere_thickness_km * p2.refraction_index);
  const totalDistance = atmosphericPath + L;
  return (totalDistance / c) * 1000;
}

function getTowerPosition(planet: PlanetNode, towerIndex: number, scale: number): { x: number; y: number } {
  const angle = (2 * Math.PI * towerIndex) / planet.active_towers;
  const cx = planet.x * scale;
  const cy = planet.y * scale;
  const r = planet.radius_km;
  return {
    x: cx + r * Math.sin(angle),
    y: cy + r * Math.cos(angle),
  };
}

function findClosestTowerPair(p1: PlanetNode, p2: PlanetNode, scale: number): { tower1: number; tower2: number } {
  let minDist = Infinity;
  let best = { tower1: 0, tower2: 0 };

  for (let i = 0; i < p1.active_towers; i++) {
    const t1 = getTowerPosition(p1, i, scale);
    for (let j = 0; j < p2.active_towers; j++) {
      const t2 = getTowerPosition(p2, j, scale);
      const dx = t2.x - t1.x;
      const dy = t2.y - t1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        best = { tower1: i, tower2: j };
      }
    }
  }
  return best;
}

function calculateSegmentsBetweenTowers(entry: number, exit: number, totalTowers: number): number {
  if (entry === exit) return 0;
  const clockwise = (exit - entry + totalTowers) % totalTowers;
  const counterClockwise = (entry - exit + totalTowers) % totalTowers;
  return Math.min(clockwise, counterClockwise);
}

function calculateFiberTransitTime(
  radius: number, numTowers: number, segments: number,
  fiberFraction: number, c: number, towerDelay: number
): number {
  const m = segments === 0 ? 1 : segments + 1;
  const arcLength = (2 * Math.PI * radius * segments) / numTowers;
  const fiberTime = (arcLength / (fiberFraction * c)) * 1000;
  return fiberTime + m * towerDelay;
}

class RoutingService {
  private state: NetworkState = { disabled_nodes: [], disabled_links: [] };

  getState(): NetworkState {
    return { ...this.state };
  }

  disableNode(id: string): void {
    if (!this.state.disabled_nodes.includes(id)) {
      this.state.disabled_nodes.push(id);
    }
  }

  enableNode(id: string): void {
    this.state.disabled_nodes = this.state.disabled_nodes.filter(n => n !== id);
  }

  disableLink(from: string, to: string): void {
    const exists = this.state.disabled_links.some(
      ([a, b]) => (a === from && b === to) || (a === to && b === from)
    );
    if (!exists) {
      this.state.disabled_links.push([from, to]);
    }
  }

  enableLink(from: string, to: string): void {
    this.state.disabled_links = this.state.disabled_links.filter(
      ([a, b]) => !((a === from && b === to) || (a === to && b === from))
    );
  }

  buildGraph(): Map<string, Map<string, number>> {
    const meta = universeService.getMetadata();
    const planets = universeService.getPlanets();
    const graph = new Map<string, Map<string, number>>();

    const activePlanets = planets.filter(p => !this.state.disabled_nodes.includes(p.id));

    for (const p of activePlanets) {
      graph.set(p.id, new Map());
    }

    for (let i = 0; i < activePlanets.length; i++) {
      for (let j = i + 1; j < activePlanets.length; j++) {
        const p1 = activePlanets[i];
        const p2 = activePlanets[j];

        const isLinkDisabled = this.state.disabled_links.some(
          ([a, b]) => (a === p1.id && b === p2.id) || (a === p2.id && b === p1.id)
        );
        if (isLinkDisabled) continue;

        const L = calculateVoidDistance(p1, p2, meta.coordinate_scale_unit_km);
        if (L > meta.max_hop_distance_km) continue;

        const Tv = calculateVoidTravelTime(p1, p2, L, meta.speed_of_light_kms);

        graph.get(p1.id)!.set(p2.id, Tv);
        graph.get(p2.id)!.set(p1.id, Tv);
      }
    }

    return graph;
  }

  findRoute(from: string, to: string): Route {
    const graph = this.buildGraph();
    const meta = universeService.getMetadata();
    const planets = universeService.getPlanets();

    if (!graph.has(from) || !graph.has(to)) {
      return { path: [], segments: [], total_latency_ms: 0, feasible: false };
    }

    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();
    const visited = new Set<string>();

    for (const node of graph.keys()) {
      dist.set(node, Infinity);
      prev.set(node, null);
    }
    dist.set(from, 0);

    while (true) {
      let minDist = Infinity;
      let current: string | null = null;

      for (const [node, d] of dist) {
        if (!visited.has(node) && d < minDist) {
          minDist = d;
          current = node;
        }
      }

      if (current === null || current === to) break;
      visited.add(current);

      const neighbors = graph.get(current);
      if (!neighbors) continue;

      for (const [neighbor, weight] of neighbors) {
        if (visited.has(neighbor)) continue;
        const alt = dist.get(current)! + weight;
        if (alt < dist.get(neighbor)!) {
          dist.set(neighbor, alt);
          prev.set(neighbor, current);
        }
      }
    }

    if (dist.get(to) === Infinity) {
      return { path: [], segments: [], total_latency_ms: 0, feasible: false };
    }

    const path: string[] = [];
    let current: string | null = to;
    while (current !== null) {
      path.unshift(current);
      current = prev.get(current) ?? null;
    }

    const segments: RouteSegment[] = [];
    let totalLatency = 0;

    for (let i = 0; i < path.length; i++) {
      const planet = planets.find(p => p.id === path[i])!;

      if (i < path.length - 1) {
        const nextPlanet = planets.find(p => p.id === path[i + 1])!;
        const L = calculateVoidDistance(planet, nextPlanet, meta.coordinate_scale_unit_km);
        const Tv = calculateVoidTravelTime(planet, nextPlanet, L, meta.speed_of_light_kms);

        const towerPair = findClosestTowerPair(planet, nextPlanet, meta.coordinate_scale_unit_km);

        let entryTower: number;
        let exitTower: number;

        if (i === 0) {
          entryTower = towerPair.tower1;
          exitTower = towerPair.tower1;
        } else {
          const prevPlanet = planets.find(p => p.id === path[i - 1])!;
          const prevPair = findClosestTowerPair(prevPlanet, planet, meta.coordinate_scale_unit_km);
          entryTower = prevPair.tower2;
          exitTower = towerPair.tower1;
        }

        const segs = calculateSegmentsBetweenTowers(entryTower, exitTower, planet.active_towers);
        const Tp = calculateFiberTransitTime(
          planet.radius_km, planet.active_towers, segs,
          meta.fiber_speed_fraction, meta.speed_of_light_kms, meta.tower_processing_delay_ms
        );

        totalLatency += Tp + Tv;

        segments.push({
          from_planet: planet.id,
          to_planet: nextPlanet.id,
          void_distance_km: L,
          void_latency_ms: Tv,
          feasible: true,
        });
      } else {
        if (i > 0) {
          const prevPlanet = planets.find(p => p.id === path[i - 1])!;
          const prevPair = findClosestTowerPair(prevPlanet, planet, meta.coordinate_scale_unit_km);
          const entryTower = prevPair.tower2;
          const exitTower = prevPair.tower2;
          const segs = calculateSegmentsBetweenTowers(entryTower, exitTower, planet.active_towers);
          const Tp = calculateFiberTransitTime(
            planet.radius_km, planet.active_towers, segs,
            meta.fiber_speed_fraction, meta.speed_of_light_kms, meta.tower_processing_delay_ms
          );
          totalLatency += Tp;
        }
      }
    }

    return { path, segments, total_latency_ms: totalLatency, feasible: true };
  }

  getReachablePlanets(from: string): string[] {
    const graph = this.buildGraph();
    if (!graph.has(from)) return [];

    const visited = new Set<string>();
    const queue = [from];
    visited.add(from);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = graph.get(current);
      if (!neighbors) continue;
      for (const neighbor of neighbors.keys()) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    visited.delete(from);
    return Array.from(visited);
  }
}

export const routingService = new RoutingService();
