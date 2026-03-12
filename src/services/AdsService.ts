import { Platform } from 'react-native';
import Constants from 'expo-constants';

import { AnalyticsService } from './AnalyticsService';

type AdEvents = {
  onLoaded?: () => void;
  onClosed?: () => void;
  onError?: (error?: Error) => void;
};

const BUILD_PROFILE =
  ((Constants.expoConfig?.extra as { buildProfile?: string } | undefined)?.buildProfile ??
    process.env.EXPO_PUBLIC_BUILD_PROFILE ??
    'local')
    .toString()
    .toLowerCase();

const ADS_ENABLED = BUILD_PROFILE === 'production' || BUILD_PROFILE === 'preview';

let InterstitialAd: any;
let AdEventType: any;
let TestIds: any;
let mobileAds: any;

let interstitial: any = null;
let isLoading = false;
let isReady = false;

function loadNativeModules() {
  if (InterstitialAd && AdEventType && TestIds && mobileAds) {
    return true;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const adsModule = require('react-native-google-mobile-ads');
    InterstitialAd = adsModule.InterstitialAd;
    AdEventType = adsModule.AdEventType;
    TestIds = adsModule.TestIds;
    mobileAds = adsModule.default;
    return true;
  } catch (error) {
    if (__DEV__) {
      console.warn('[Ads] Módulo de ads indisponível.', error);
    }
    return false;
  }
}

function getAdUnitId() {
  if (!ADS_ENABLED) {
    return null;
  }

  if (BUILD_PROFILE !== 'production') {
    return TestIds?.INTERSTITIAL ?? null;
  }

  return Platform.select({
    ios: process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID ?? null,
    android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID ?? null,
  });
}

export async function initializeAds() {
  if (!ADS_ENABLED) {
    return false;
  }

  if (!loadNativeModules()) {
    return false;
  }

  try {
    await mobileAds().initialize();
    return true;
  } catch (error) {
    if (__DEV__) {
      console.warn('[Ads] Falha ao inicializar mobileAds.', error);
    }
    return false;
  }
}

function attachListeners(instance: any, events?: AdEvents) {
  if (!instance) {
    return;
  }

  if (instance.__listenersAttached) {
    return;
  }

  instance.addAdEventListener(AdEventType.LOADED, () => {
    isLoading = false;
    isReady = true;
    events?.onLoaded?.();
  });

  instance.addAdEventListener(AdEventType.CLOSED, () => {
    isReady = false;
    events?.onClosed?.();
    preloadInterstitial(events);
  });

  instance.addAdEventListener(AdEventType.ERROR, (error: Error) => {
    isLoading = false;
    isReady = false;
    AnalyticsService.trackInterstitialFailed({ message: error?.message });
    events?.onError?.(error);
    if (__DEV__) {
      console.warn('[Ads] Interstitial falhou.', error);
    }
  });

  instance.addAdEventListener(AdEventType.CLICKED, () => {
    AnalyticsService.trackInterstitialClicked();
  });

  instance.__listenersAttached = true;
}

export function preloadInterstitial(events?: AdEvents) {
  if (!ADS_ENABLED) {
    return;
  }

  if (!loadNativeModules()) {
    return;
  }

  const adUnitId = getAdUnitId();
  if (!adUnitId) {
    return;
  }

  if (interstitial && isReady) {
    return;
  }

  if (isLoading) {
    return;
  }

  interstitial = InterstitialAd.createForAdRequest(adUnitId, {
    requestNonPersonalizedAdsOnly: true,
  });

  isLoading = true;
  attachListeners(interstitial, events);
  interstitial.load();
}

export async function showInterstitial() {
  if (!interstitial || !isReady) {
    return false;
  }

  try {
    await interstitial.show();
    AnalyticsService.trackInterstitialShown({ placement: 'gameplay' });
    isReady = false;
    return true;
  } catch (error) {
    AnalyticsService.trackInterstitialFailed({ message: error instanceof Error ? error.message : 'unknown' });
    if (__DEV__) {
      console.warn('[Ads] Falha ao exibir interstitial.', error);
    }
    return false;
  }
}

export function adsAreReady() {
  return isReady;
}
