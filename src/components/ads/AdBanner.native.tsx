import { Platform, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';

const BUILD_PROFILE =
  ((Constants.expoConfig?.extra as { buildProfile?: string } | undefined)?.buildProfile ??
    process.env.EXPO_PUBLIC_BUILD_PROFILE ??
    'local')
    .toString()
    .toLowerCase();

const ADS_ENABLED = BUILD_PROFILE === 'production' || BUILD_PROFILE === 'preview';

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

  // Expo Go does not include native AdMob modules.
  if (Constants.appOwnership === 'expo') {
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

  const adUnitId = BUILD_PROFILE === 'production' ? getAdUnitId() : TestIds.BANNER;

  if (!adUnitId) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <BannerAd unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
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
