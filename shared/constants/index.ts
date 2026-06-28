import type { UniverseMetadata } from '../types/universe.js';

/** Default universe metadata values used when fields are missing from config */
export const DEFAULT_UNIVERSE_METADATA: UniverseMetadata = {
  speed_of_light_kms: 299792.458,
  fiber_speed_fraction: 0.67,
  tower_processing_delay_ms: 1.5,
  max_hop_distance_km: 50000,
  coordinate_scale_unit_km: 1000,
};

/** Minimum number of towers required for a planet to be routable */
export const MIN_ACTIVE_TOWERS = 1;

/** Maximum payload size in characters */
export const MAX_PAYLOAD_LENGTH = 4096;

/** Standard ASCII base used for human-readable text */
export const ASCII_BASE = 256;
