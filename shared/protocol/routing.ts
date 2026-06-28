/**
 * Graph construction and shortest-path routing for the Relic Ring Protocol.
 *
 * Builds a weighted adjacency graph from the universe configuration and
 * runs Dijkstra's algorithm to find the lowest-latency route between
 * any two planets.
 */

import type { PlanetNode, UniverseMetadata } from '../types/universe';
import type { Route, RouteSegment } from '../types/routing';
import { calculateVoidDistance, calculateVoidTravelTime } from './latency';

/**
 * Build a weighted adjacency graph from the universe configuration.
 *
 * An edge exists between two planets only if:
 *   1. Neither planet is in the disabled nodes list.
 *   2. The link between them is not in the disabled links list.
 *   3. The void distance between them is <= max_hop_distance_km.
 *
 * Edge weight is the void travel time in milliseconds.
 *
 * @param planets - Array of all planet nodes
 * @param metadata - Universe metadata with physics constants
 * @param disabledNodes - Planet IDs that are currently offline
 * @param disabledLinks - Pairs of planet IDs whose links are down
 * @returns Adjacency map: outer key = planet ID, inner key = neighbour ID, value = latency ms
 */
export function buildAdjacencyGraph(
  planets: PlanetNode[],
  metadata: UniverseMetadata,
  disabledNodes: string[],
  disabledLinks: [string, string][],
): Map<string, Map<string, number>> {
  const graph: Map<string, Map<string, number>> = new Map();
  const disabledNodeSet: Set<string> = new Set(disabledNodes);

  // Normalise disabled links into a set of "id1|id2" keys (both directions)
  const disabledLinkSet: Set<string> = new Set();
  for (const [a, b] of disabledLinks) {
    disabledLinkSet.add(`${a}|${b}`);
    disabledLinkSet.add(`${b}|${a}`);
  }

  // Initialise an entry for every active planet
  const activePlanets: PlanetNode[] = planets.filter(
    (p: PlanetNode) => !disabledNodeSet.has(p.id),
  );
  for (const planet of activePlanets) {
    graph.set(planet.id, new Map());
  }

  // Build edges between all active planet pairs
  for (let i = 0; i < activePlanets.length; i++) {
    for (let j = i + 1; j < activePlanets.length; j++) {
      const p1: PlanetNode = activePlanets[i];
      const p2: PlanetNode = activePlanets[j];

      // Skip disabled links
      if (disabledLinkSet.has(`${p1.id}|${p2.id}`)) {
        continue;
      }

      const voidDist: number = calculateVoidDistance(
        p1,
        p2,
        metadata.coordinate_scale_unit_km,
      );

      // Only create an edge if within maximum hop distance
      if (voidDist > metadata.max_hop_distance_km) {
        continue;
      }

      const travelTime: number = calculateVoidTravelTime(
        p1,
        p2,
        voidDist,
        metadata.speed_of_light_kms,
      );

      graph.get(p1.id)!.set(p2.id, travelTime);
      graph.get(p2.id)!.set(p1.id, travelTime);
    }
  }

  return graph;
}

/**
 * Find the lowest-latency route between two planets using Dijkstra's algorithm.
 *
 * @param graph - Weighted adjacency graph from buildAdjacencyGraph
 * @param source - Source planet ID
 * @param destination - Destination planet ID
 * @returns Route object with the shortest path, segments, and total latency.
 *          If no path exists, returns a Route with feasible = false.
 */
export function dijkstra(
  graph: Map<string, Map<string, number>>,
  source: string,
  destination: string,
): Route {
  // Edge case: source equals destination
  if (source === destination) {
    return {
      path: [source],
      segments: [],
      total_latency_ms: 0,
      feasible: true,
    };
  }

  // Initialise distances and predecessors
  const dist: Map<string, number> = new Map();
  const prev: Map<string, string | null> = new Map();
  const visited: Set<string> = new Set();

  for (const node of graph.keys()) {
    dist.set(node, Infinity);
    prev.set(node, null);
  }

  // Source or destination not in the graph
  if (!graph.has(source) || !graph.has(destination)) {
    return {
      path: [],
      segments: [],
      total_latency_ms: 0,
      feasible: false,
    };
  }

  dist.set(source, 0);

  // Simple priority queue using linear scan (adequate for small planet counts)
  while (true) {
    // Find the unvisited node with the smallest distance
    let current: string | null = null;
    let currentDist: number = Infinity;

    for (const [node, d] of dist) {
      if (!visited.has(node) && d < currentDist) {
        current = node;
        currentDist = d;
      }
    }

    // No more reachable nodes
    if (current === null) {
      break;
    }

    // Reached the destination
    if (current === destination) {
      break;
    }

    visited.add(current);

    // Relax neighbours
    const neighbours: Map<string, number> | undefined = graph.get(current);
    if (neighbours) {
      for (const [neighbour, weight] of neighbours) {
        if (visited.has(neighbour)) {
          continue;
        }
        const alt: number = currentDist + weight;
        if (alt < dist.get(neighbour)!) {
          dist.set(neighbour, alt);
          prev.set(neighbour, current);
        }
      }
    }
  }

  // Reconstruct path
  const destDist: number | undefined = dist.get(destination);
  if (destDist === undefined || destDist === Infinity) {
    return {
      path: [],
      segments: [],
      total_latency_ms: 0,
      feasible: false,
    };
  }

  const path: string[] = [];
  let step: string | null = destination;
  while (step !== null) {
    path.unshift(step);
    step = prev.get(step) ?? null;
  }

  // Build route segments
  const segments: RouteSegment[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const from: string = path[i];
    const to: string = path[i + 1];
    const edgeWeight: number = graph.get(from)!.get(to)!;

    segments.push({
      from_planet: from,
      to_planet: to,
      void_distance_km: 0, // Will be populated by caller if needed
      void_latency_ms: edgeWeight,
      feasible: true,
    });
  }

  return {
    path,
    segments,
    total_latency_ms: destDist,
    feasible: true,
  };
}
