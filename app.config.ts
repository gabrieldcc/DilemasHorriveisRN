import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'dilemas-horriveis-rn',
  slug: 'dilemas-horriveis-rn',
  scheme: 'dilemas-horriveis-rn',
  userInterfaceStyle: 'dark',
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: true,
  },
});
