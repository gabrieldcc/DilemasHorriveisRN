import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
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
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: true,
  },
});
