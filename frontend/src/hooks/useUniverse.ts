import { create } from 'zustand';
import type { UniverseMetadata, PlanetNode } from '@/types';
import { fetchUniverse } from '@/lib/api';

interface UniverseStore {
  planets: PlanetNode[];
  metadata: UniverseMetadata | null;
  loading: boolean;
  error: string | null;
  fetchUniverse: () => Promise<void>;
}

export const useUniverse = create<UniverseStore>((set) => ({
  planets: [],
  metadata: null,
  loading: false,
  error: null,

  fetchUniverse: async () => {
    set({ loading: true, error: null });
    try {
      const config = await fetchUniverse();
      set({
        planets: config.planets,
        metadata: config.universe_metadata,
        loading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch universe',
        loading: false,
      });
    }
  },
}));
