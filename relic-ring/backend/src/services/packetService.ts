import { universeService } from './universeService.js';
import { routingService } from './routingService.js';
import { encodePayload, decodePayload } from './codexService.js';

export interface HopLogEntry {
  planet_id: string;
  tower_entry: number;
  tower_exit: number;
  codex_base: number;
  payload_in_codex: string[];
  payload_ascii: string;
  fiber_latency_ms: number;
  tower_delay_ms: number;
  void_latency_ms: number | null;
  atmospheric_delay_ms: number | null;
  cumulative_latency_ms: number;
}

export interface Packet {
  id: string;
  origin_id: string;
  destination_id: string;
  current_id: string;
  payload: string;
  payload_ascii: number[];
  hop_log: HopLogEntry[];
  status: 'pending' | 'in_transit' | 'delivered' | 'undeliverable';
  total_latency_ms: number;
  route_path: string[];
  timestamp: number;
}

const packetHistory: Packet[] = [];
let packetCounter = 0;

function generatePacketId(): string {
  packetCounter++;
  const hex = packetCounter.toString(16).toUpperCase().padStart(3, '0');
  const suffix = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + Math.floor(Math.random() * 10);
  return `RR-${hex}-${suffix}`;
}

function calculateVoidDistance(p1: any, p2: any, scale: number): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const centerDist = Math.sqrt(dx * dx + dy * dy) * scale;
  return Math.max(0, centerDist - (p1.radius_km + p1.atmosphere_thickness_km) - (p2.radius_km + p2.atmosphere_thickness_km));
}

function calculateVoidTravelTime(p1: any, p2: any, L: number, c: number): number {
  const atm = (p1.atmosphere_thickness_km * p1.refraction_index) + (p2.atmosphere_thickness_km * p2.refraction_index);
  return ((atm + L) / c) * 1000;
}

function getTowerAngle(index: number, total: number): number {
  return (2 * Math.PI * index) / total;
}

function getTowerPosition(planet: any, index: number, scale: number) {
  const angle = getTowerAngle(index, planet.active_towers);
  return {
    x: planet.x * scale + planet.radius_km * Math.sin(angle),
    y: planet.y * scale + planet.radius_km * Math.cos(angle),
  };
}

function findClosestTowerPair(p1: any, p2: any, scale: number): { tower1: number; tower2: number } {
  let minDist = Infinity;
  let best = { tower1: 0, tower2: 0 };
  for (let i = 0; i < p1.active_towers; i++) {
    const t1 = getTowerPosition(p1, i, scale);
    for (let j = 0; j < p2.active_towers; j++) {
      const t2 = getTowerPosition(p2, j, scale);
      const d = Math.sqrt((t2.x - t1.x) ** 2 + (t2.y - t1.y) ** 2);
      if (d < minDist) { minDist = d; best = { tower1: i, tower2: j }; }
    }
  }
  return best;
}

function segmentsBetweenTowers(entry: number, exit: number, total: number): number {
  if (entry === exit) return 0;
  const cw = (exit - entry + total) % total;
  const ccw = (entry - exit + total) % total;
  return Math.min(cw, ccw);
}

function fiberTransitTime(radius: number, numTowers: number, segs: number, f: number, c: number, dt: number): number {
  const m = segs === 0 ? 1 : segs + 1;
  const arcLen = (2 * Math.PI * radius * segs) / numTowers;
  const fiberMs = (arcLen / (f * c)) * 1000;
  return fiberMs + m * dt;
}

export function sendPacket(originId: string, destinationId: string, payload: string): Packet {
  const meta = universeService.getMetadata();
  const origin = universeService.getPlanetById(originId);
  const destination = universeService.getPlanetById(destinationId);

  if (!origin || !destination) {
    const packet: Packet = {
      id: generatePacketId(), origin_id: originId, destination_id: destinationId,
      current_id: originId, payload, payload_ascii: [...payload].map(c => c.charCodeAt(0)),
      hop_log: [], status: 'undeliverable', total_latency_ms: 0, route_path: [], timestamp: Date.now(),
    };
    packetHistory.push(packet);
    return packet;
  }

  const route = routingService.findRoute(originId, destinationId);

  if (!route.feasible || route.path.length === 0) {
    const packet: Packet = {
      id: generatePacketId(), origin_id: originId, destination_id: destinationId,
      current_id: originId, payload, payload_ascii: [...payload].map(c => c.charCodeAt(0)),
      hop_log: [], status: 'undeliverable', total_latency_ms: 0, route_path: [], timestamp: Date.now(),
    };
    packetHistory.push(packet);
    return packet;
  }

  const hopLog: HopLogEntry[] = [];
  let cumulativeLatency = 0;

  for (let i = 0; i < route.path.length; i++) {
    const planetId = route.path[i];
    const planet = universeService.getPlanetById(planetId)!;

    let towerEntry: number;
    let towerExit: number;
    let voidLatency: number | null = null;
    let atmosphericDelay: number | null = null;

    if (i === 0) {
      if (i < route.path.length - 1) {
        const nextPlanet = universeService.getPlanetById(route.path[i + 1])!;
        const pair = findClosestTowerPair(planet, nextPlanet, meta.coordinate_scale_unit_km);
        towerEntry = pair.tower1;
        towerExit = pair.tower1;
      } else {
        towerEntry = 0;
        towerExit = 0;
      }
    } else {
      const prevPlanet = universeService.getPlanetById(route.path[i - 1])!;
      const inPair = findClosestTowerPair(prevPlanet, planet, meta.coordinate_scale_unit_km);
      towerEntry = inPair.tower2;

      if (i < route.path.length - 1) {
        const nextPlanet = universeService.getPlanetById(route.path[i + 1])!;
        const outPair = findClosestTowerPair(planet, nextPlanet, meta.coordinate_scale_unit_km);
        towerExit = outPair.tower1;
      } else {
        towerExit = inPair.tower2;
      }
    }

    const segs = segmentsBetweenTowers(towerEntry, towerExit, planet.active_towers);
    const fiberLat = fiberTransitTime(
      planet.radius_km, planet.active_towers, segs,
      meta.fiber_speed_fraction, meta.speed_of_light_kms, meta.tower_processing_delay_ms
    );

    const m = segs === 0 ? 1 : segs + 1;
    const towerDelay = m * meta.tower_processing_delay_ms;

    cumulativeLatency += fiberLat;

    if (i < route.path.length - 1) {
      const nextPlanet = universeService.getPlanetById(route.path[i + 1])!;
      const L = calculateVoidDistance(planet, nextPlanet, meta.coordinate_scale_unit_km);
      const Tv = calculateVoidTravelTime(planet, nextPlanet, L, meta.speed_of_light_kms);
      voidLatency = Tv;
      atmosphericDelay = ((planet.atmosphere_thickness_km * planet.refraction_index) +
        (nextPlanet.atmosphere_thickness_km * nextPlanet.refraction_index)) / meta.speed_of_light_kms * 1000;
      cumulativeLatency += Tv;
    }

    let nextHopBase = planet.codex;
    if (i < route.path.length - 1) {
      const nextPlanet = universeService.getPlanetById(route.path[i + 1])!;
      nextHopBase = nextPlanet.codex;
    }

    const payloadInCodex = encodePayload(payload, nextHopBase);

    hopLog.push({
      planet_id: planetId,
      tower_entry: towerEntry,
      tower_exit: towerExit,
      codex_base: nextHopBase,
      payload_in_codex: payloadInCodex,
      payload_ascii: payload,
      fiber_latency_ms: fiberLat - towerDelay,
      tower_delay_ms: towerDelay,
      void_latency_ms: voidLatency,
      atmospheric_delay_ms: atmosphericDelay,
      cumulative_latency_ms: cumulativeLatency,
    });
  }

  const packet: Packet = {
    id: generatePacketId(),
    origin_id: originId,
    destination_id: destinationId,
    current_id: destinationId,
    payload,
    payload_ascii: [...payload].map(c => c.charCodeAt(0)),
    hop_log: hopLog,
    status: 'delivered',
    total_latency_ms: cumulativeLatency,
    route_path: route.path,
    timestamp: Date.now(),
  };

  packetHistory.push(packet);
  return packet;
}

export function getHistory(): Packet[] {
  return [...packetHistory].reverse();
}
