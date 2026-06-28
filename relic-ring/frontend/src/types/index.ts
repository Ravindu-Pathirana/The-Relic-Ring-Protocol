// Universe types
export interface UniverseMetadata {
  universe_id?: string;
  speed_of_light_kms: number;
  fiber_speed_fraction: number;
  tower_processing_delay_ms: number;
  max_hop_distance_km: number;
  coordinate_scale_unit_km: number;
}

export interface PlanetNode {
  id: string;
  codex: number;
  x: number;
  y: number;
  radius_km: number;
  active_towers: number;
  atmosphere_thickness_km: number;
  refraction_index: number;
}

export interface UniverseConfig {
  universe_metadata: UniverseMetadata;
  planets: PlanetNode[];
}

// Packet types
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

export type PacketStatus = 'pending' | 'in_transit' | 'delivered' | 'undeliverable';

export interface Packet {
  id: string;
  origin_id: string;
  destination_id: string;
  current_id: string;
  payload: string;
  payload_ascii: number[];
  hop_log: HopLogEntry[];
  status: PacketStatus;
  total_latency_ms: number;
  route_path: string[];
  timestamp: number;
}

// Routing types
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
