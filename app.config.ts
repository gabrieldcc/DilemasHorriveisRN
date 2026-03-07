import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const plugins: ExpoConfig['plugins'] = ['expo-router'];
  plugins.push('@react-native-firebase/app');
  plugins.push('@react-native-firebase/crashlytics');

  if (process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID) {
    plugins.push([
      'react-native-google-mobile-ads',
      {
        androidAppId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID,
        iosAppId: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID,
      },
    ]);
  }

  return {
    ...config,
    name: 'dilemas-horriveis-rn',
    slug: 'dilemas-horriveis-rn',
    scheme: 'dilemas-horriveis-rn',
    userInterfaceStyle: 'dark',
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
