import { create } from 'zustand';

import { DEFAULT_FEATURE_FLAGS, FeatureFlags } from '../models/featureFlags';
import { subscribeFeatureFlags } from '../services/featureFlagsService';

interface FeatureFlagsState {
  flags: FeatureFlags;
  isLoaded: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  setFlagsLocal: (next: Partial<FeatureFlags>) => void;
}

let unsubscribeFn: (() => void) | null = null;

export const useFeatureFlagsStore = create<FeatureFlagsState>((set, get) => ({
  flags: DEFAULT_FEATURE_FLAGS,
  isLoaded: false,
  error: null,
  startListening: () => {
    if (unsubscribeFn) {
      return;
    }

    unsubscribeFn = subscribeFeatureFlags(
      (flags) => {
        set({
          flags,
          isLoaded: true,
          error: null,
        });
      },
      (error) => {
        set({
          flags: DEFAULT_FEATURE_FLAGS,
          isLoaded: true,
          error: error.message,
        });
        if (__DEV__) {
          console.error('[FeatureFlags] Falha ao ouvir flags:', error);
        }
      }
    );

    if (!get().isLoaded) {
      set({ isLoaded: false });
    }
  },
  stopListening: () => {
    if (unsubscribeFn) {
      unsubscribeFn();
      unsubscribeFn = null;
    }
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
