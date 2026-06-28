export interface UniverseMetadata {
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
