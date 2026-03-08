import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const buildProfile = process.env.EAS_BUILD_PROFILE ?? process.env.EXPO_PUBLIC_BUILD_PROFILE ?? 'local';
  const plugins: ExpoConfig['plugins'] = ['expo-router'];
  plugins.push('@react-native-firebase/app');
  plugins.push('@react-native-firebase/crashlytics');

  const androidAdmobAppId = process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID?.trim();
  const iosAdmobAppId = process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID?.trim();
  const admobAppIdPattern = /^ca-app-pub-\d{16}~\d{10}$/;
  const shouldEnableAdsNative = buildProfile === 'production';

  if (shouldEnableAdsNative && !androidAdmobAppId) {
    throw new Error('EXPO_PUBLIC_ADMOB_ANDROID_APP_ID é obrigatório para build production.');
  }

  if (shouldEnableAdsNative && !iosAdmobAppId) {
    throw new Error('EXPO_PUBLIC_ADMOB_IOS_APP_ID é obrigatório para build production.');
  }

  if (shouldEnableAdsNative && androidAdmobAppId && !admobAppIdPattern.test(androidAdmobAppId)) {
    throw new Error(
      'EXPO_PUBLIC_ADMOB_ANDROID_APP_ID inválido. Use formato de App ID: ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY (não use Banner Unit ID com "/").'
    );
  }

  if (shouldEnableAdsNative && iosAdmobAppId && !admobAppIdPattern.test(iosAdmobAppId)) {
    throw new Error(
      'EXPO_PUBLIC_ADMOB_IOS_APP_ID inválido. Use formato de App ID: ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY (não use Banner Unit ID com "/").'
    );
  }

  if (shouldEnableAdsNative) {
    plugins.push([
      'react-native-google-mobile-ads',
      {
        androidAppId: androidAdmobAppId,
        iosAppId: iosAdmobAppId,
      },
    ]);
  }

  return {
    ...config,
    name: 'dilemas-horriveis-rn',
    slug: 'dilemas-horriveis-rn',
    scheme: 'dilemas-horriveis-rn',
    userInterfaceStyle: 'dark',
    extra: {
      ...config.extra,
      buildProfile,
    },
    android: {
      ...config.android,
      package: 'com.gab.dilemas.android',
      googleServicesFile: './google-services.json',
    },
    ios: {
      ...config.ios,
      bundleIdentifier: 'com.gab.dilemas.ios',
      googleServicesFile: './GoogleService-Info.plist',
    },
    plugins,
    experiments: {
      typedRoutes: true,
    },
  };
};
