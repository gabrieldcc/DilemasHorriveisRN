import { Platform, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';

function getAdUnitId() {
  const configured = Platform.select({
    android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID,
    ios: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID,
  });

  if (!configured) {
    if (__DEV__) {
      console.warn('[Ads] Banner ID nao configurado.');
    }
    return null;
  }

  return configured;
}

export function AdBanner() {
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
      console.warn('[Ads] Modulo nativo de ads nao encontrado no build atual.');
    }
    return null;
  }

  if (!BannerAd || !BannerAdSize || !TestIds) {
    return null;
  }

  const adUnitId = __DEV__ ? TestIds.BANNER : getAdUnitId();

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
