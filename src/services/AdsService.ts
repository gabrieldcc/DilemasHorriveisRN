import { Platform } from 'react-native';
import Constants from 'expo-constants';

import { AnalyticsService } from './analyticsService';

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

// Habilita anúncios também em Dev Client; produção continua usando IDs reais se configurados.
const ADS_ENABLED = true;
const USE_TEST_IDS = BUILD_PROFILE !== 'production';

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
      console.warn('[Ads] Módulo nativo de ads indisponível. Reconstrua Dev Client com react-native-google-mobile-ads.', error);
    }
    return false;
  }
}

function getAdUnitId() {
  if (USE_TEST_IDS) {
    const id = TestIds?.INTERSTITIAL ?? null;
    if (__DEV__) {
      console.info('[Ads] Usando TestIds.INTERSTITIAL (dev/preproduction).');
    }
    return id;
  }

  return Platform.select({
    ios: process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID ?? null,
    android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID ?? null,
  });
}

export async function initializeAds() {
  if (!ADS_ENABLED) {
    if (__DEV__) {
      console.info('[Ads] Ads desativados para build não-production.');
    }
    return false;
  }

  if (!loadNativeModules()) {
    return false;
  }

  try {
    await mobileAds().initialize();
    if (__DEV__) {
      console.info('[Ads] SDK inicializado.');
    }
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
    if (__DEV__) {
      console.info('[Ads] Interstitial já pronto, skip preload.');
    }
    return;
  }

  if (isLoading) {
    if (__DEV__) {
      console.info('[Ads] Preload em andamento, skip.');
    }
    return;
  }

  interstitial = InterstitialAd.createForAdRequest(adUnitId, {
    requestNonPersonalizedAdsOnly: true,
  });

  isLoading = true;
  if (__DEV__) {
    console.info('[Ads] Iniciando preload interstitial.', { adUnitId, useTestIds: USE_TEST_IDS });
  }
  attachListeners(interstitial, events);
  interstitial.load();
}

export async function showInterstitial() {
  if (!interstitial || !isReady) {
    if (__DEV__) {
      console.info('[Ads] Interstitial não pronto no show().');
    }
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
