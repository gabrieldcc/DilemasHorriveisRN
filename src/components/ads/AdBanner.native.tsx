import { Platform, StyleSheet, View } from 'react-native';
import { trackAdClick, trackAdImpression } from '../../services/analyticsService';
import { adsBuildProfile, shouldUseTestAdIds } from '../../services/adsRuntime';

const ADS_ENABLED = true;

function getAdUnitId() {
  const configured = Platform.select({
    android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID,
    ios: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID,
  });

  if (!configured) {
    if (__DEV__) {
      console.warn('[Ads] Banner ID não configurado.');
    }
    return null;
  }

  return configured;
}

export function AdBanner() {
  if (!ADS_ENABLED) {
    return null;
  }

  let BannerAd: any;
  let BannerAdSize: any;
  let TestIds: any;

  try {
    const adsModule = require('react-native-google-mobile-ads');
    BannerAd = adsModule.BannerAd;
    BannerAdSize = adsModule.BannerAdSize;
    TestIds = adsModule.TestIds;
  } catch {
    if (__DEV__) {
      console.warn('[Ads] Módulo nativo de ads não encontrado no build atual.');
    }
    return null;
  }

  if (!BannerAd || !BannerAdSize || !TestIds) {
    return null;
  }

  const adUnitId = shouldUseTestAdIds ? TestIds.BANNER : getAdUnitId();

  if (!adUnitId) {
    return null;
  }

  if (__DEV__) {
    console.info('[Ads][Banner] Rendering banner', { adUnitId, buildProfile: adsBuildProfile, useTestIds: shouldUseTestAdIds });
  }

  return (
    <View style={styles.wrapper}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={() => {
          void trackAdImpression('banner', adUnitId);
        }}
        onAdOpened={() => {
          void trackAdClick('banner', adUnitId);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
});
