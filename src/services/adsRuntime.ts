import Constants from 'expo-constants';

const BUILD_PROFILE =
  ((Constants.expoConfig?.extra as { buildProfile?: string } | undefined)?.buildProfile ??
    process.env.EXPO_PUBLIC_BUILD_PROFILE ??
    'local')
    .toString()
    .toLowerCase();

export const adsBuildProfile = BUILD_PROFILE;
export const shouldUseTestAdIds = __DEV__ || BUILD_PROFILE === 'development';
