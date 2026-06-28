import fs from 'fs';
import path from 'path';

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

const DEFAULTS: UniverseMetadata = {
  speed_of_light_kms: 300000,
  fiber_speed_fraction: 0.67,
  tower_processing_delay_ms: 7,
  max_hop_distance_km: 50000000,
  coordinate_scale_unit_km: 100000,
};

class UniverseService {
  private config: UniverseConfig | null = null;

  load(): void {
    let configPath = path.resolve(__dirname, '../../../../universe/universe-config.json');
    if (!fs.existsSync(configPath)) {
      configPath = path.resolve(process.cwd(), '../universe/universe-config.json');
    }
    if (!fs.existsSync(configPath)) {
      configPath = path.resolve(process.cwd(), 'universe/universe-config.json');
    }
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);

    const metadata: UniverseMetadata = {
      ...DEFAULTS,
      ...parsed.universe_metadata,
    };

    this.config = {
      universe_metadata: metadata,
      planets: parsed.planets || [],
    };
  }

  getConfig(): UniverseConfig {
    if (!this.config) throw new Error('Universe not loaded');
    return this.config;
  }

  getMetadata(): UniverseMetadata {
    return this.getConfig().universe_metadata;
  }

  getPlanets(): PlanetNode[] {
    return this.getConfig().planets;
  }

  getPlanetById(id: string): PlanetNode | undefined {
    return this.getPlanets().find(p => p.id === id);
  }
}

export const universeService = new UniverseService();
