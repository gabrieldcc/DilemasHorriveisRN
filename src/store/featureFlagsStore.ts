import { create } from 'zustand';

import { DEFAULT_FEATURE_FLAGS, FeatureFlags } from '../models/featureFlags';
import { fetchFeatureFlags } from '../services/featureFlagsService';

interface FeatureFlagsState {
  flags: FeatureFlags;
  isLoaded: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  setFlagsLocal: (next: Partial<FeatureFlags>) => void;
}

export const useFeatureFlagsStore = create<FeatureFlagsState>((set, get) => ({
  flags: DEFAULT_FEATURE_FLAGS,
  isLoaded: false,
  error: null,
  startListening: () => {
    if (get().isLoaded) {
      return;
    }

    if (!get().isLoaded) {
      set({ isLoaded: false });
    }

    void fetchFeatureFlags()
      .then((flags) => {
        set({
          flags,
          isLoaded: true,
          error: null,
        });
      })
      .catch((error) => {
        set({
          flags: DEFAULT_FEATURE_FLAGS,
          isLoaded: true,
          error: error.message,
        });
        if (__DEV__) {
          console.error('[FeatureFlags] Falha ao carregar flags:', error);
        }
      });
  },
  stopListening: () => {
    // No-op: flags are fetched once per session to reduce recurring reads.
  },
  setFlagsLocal: (next) => {
    set((state) => ({
      flags: {
        ...state.flags,
        ...next,
      },
    }));
  },
}));
