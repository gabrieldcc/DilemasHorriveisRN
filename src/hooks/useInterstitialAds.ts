import { useCallback, useEffect, useState } from 'react';

import { AnalyticsService } from '../services/analyticsService';
import { areAdsEnabled, getInterstitialFrequency, initRemoteConfig, isFirstSessionAdsEnabled } from '../services/RemoteConfigService';
import { adsAreReady, initializeAds, preloadInterstitial, showInterstitial } from '../services/AdsService';
import { incrementQuestionCount, shouldShowAd } from '../utils/sessionManager';
import { isFirstLaunch } from '../utils/firstLaunchManager';

export function useInterstitialAds() {
  const [isFirstSession, setIsFirstSession] = useState<boolean | null>(null);
  const [adsInitialized, setAdsInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      await initRemoteConfig();
      const firstLaunch = await isFirstLaunch();
      if (mounted) {
        setIsFirstSession(firstLaunch);
      }
      const initialized = await initializeAds();
      if (mounted) {
        setAdsInitialized(initialized);
      }
      if (initialized) {
        preloadInterstitial();
      }
    };

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  const registerAnswerAndMaybeShowAd = useCallback(async () => {
    incrementQuestionCount();

    if (!adsInitialized) {
      return false;
    }

    if (isFirstSession === null) {
      return false;
    }

    if (isFirstSession && !isFirstSessionAdsEnabled()) {
      return false;
    }

    if (!areAdsEnabled()) {
      return false;
    }

    const frequency = getInterstitialFrequency();
    const canShow = shouldShowAd(frequency);
    if (!canShow) {
      if (!adsAreReady()) {
        preloadInterstitial();
      }
      return false;
    }

    const shown = await showInterstitial();
    if (!shown && !adsAreReady()) {
      preloadInterstitial();
      AnalyticsService.trackInterstitialFailed({ reason: 'not_ready' });
    }
    return shown;
  }, [adsInitialized, isFirstSession]);

  const ensurePreload = useCallback(() => {
    if (adsInitialized && !adsAreReady()) {
      preloadInterstitial();
    }
  }, [adsInitialized]);

  return {
    registerAnswerAndMaybeShowAd,
    ensurePreload,
    isFirstSession: isFirstSession ?? true,
  };
}
