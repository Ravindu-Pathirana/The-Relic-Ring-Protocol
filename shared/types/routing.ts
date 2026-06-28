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
  active_nodes: string[];
  disabled_nodes: string[];
  disabled_links: [string, string][];
}
