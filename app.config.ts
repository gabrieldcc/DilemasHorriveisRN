import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const buildProfile = process.env.EAS_BUILD_PROFILE ?? process.env.EXPO_PUBLIC_BUILD_PROFILE ?? 'local';
  const buildPlatform = (process.env.EAS_BUILD_PLATFORM ?? '').trim().toLowerCase();
  const plugins: ExpoConfig['plugins'] = ['expo-router'];
  plugins.push('@react-native-firebase/app');
  plugins.push('@react-native-firebase/crashlytics');

  const androidAdmobAppIdEnv = process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID?.trim();
  const iosAdmobAppIdEnv = process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID?.trim();
  const admobAppIdPattern = /^ca-app-pub-\d{16}~\d{10}$/;
  const isProductionBuild = buildProfile === 'production';

  // Test App IDs from Google docs.
  const testAndroidAppId = 'ca-app-pub-3940256099942544~3347511713';
  const testIosAppId = 'ca-app-pub-3940256099942544~1458002511';
  const androidAdmobAppId = isProductionBuild ? androidAdmobAppIdEnv : androidAdmobAppIdEnv || testAndroidAppId;
  const iosAdmobAppId = isProductionBuild ? iosAdmobAppIdEnv : iosAdmobAppIdEnv || testIosAppId;

  const validateAndroidAppId = !isProductionBuild ? false : buildPlatform ? buildPlatform === 'android' : true;
  const validateIosAppId = !isProductionBuild ? false : buildPlatform ? buildPlatform === 'ios' : true;

  if (validateAndroidAppId && !androidAdmobAppId) {
    throw new Error('EXPO_PUBLIC_ADMOB_ANDROID_APP_ID é obrigatório para build production.');
  }

  if (validateIosAppId && !iosAdmobAppId) {
    throw new Error('EXPO_PUBLIC_ADMOB_IOS_APP_ID é obrigatório para build production.');
  }

  if (androidAdmobAppId && !admobAppIdPattern.test(androidAdmobAppId)) {
    throw new Error(
      'EXPO_PUBLIC_ADMOB_ANDROID_APP_ID inválido. Use formato de App ID: ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY (não use Banner Unit ID com "/").'
    );
  }

  if (iosAdmobAppId && !admobAppIdPattern.test(iosAdmobAppId)) {
    throw new Error(
      'EXPO_PUBLIC_ADMOB_IOS_APP_ID inválido. Use formato de App ID: ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY (não use Banner Unit ID com "/").'
    );
  }

  plugins.push([
    'react-native-google-mobile-ads',
    {
      androidAppId: androidAdmobAppId,
      iosAppId: iosAdmobAppId,
    },
  ]);
  plugins.push([
    'expo-build-properties',
    {
      ios: {
        extraPods: [
          {
            name: 'GoogleUtilities',
            modular_headers: true,
          },
          {
            name: 'GoogleDataTransport',
            modular_headers: true,
          },
          {
            name: 'nanopb',
            modular_headers: true,
          },
          {
            name: 'FirebaseABTesting',
            modular_headers: true,
          },
        ],
      },
    },
  ]);

  return {
    ...config,
    name: 'BadPick',
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
