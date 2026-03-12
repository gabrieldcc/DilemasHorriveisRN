const DEFAULTS = {
  interstitial_frequency: 5,
  enable_ads: true,
  ads_first_session_enabled: false,
};

let remoteConfigModule: any = null;
let initialized = false;
let activationTried = false;

function getRemoteConfigInstance() {
  if (remoteConfigModule) {
    return remoteConfigModule;
  }

  try {
    // Lazy require to avoid crashing when module is unavailable in dev.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    remoteConfigModule = require('@react-native-firebase/remote-config').default();
  } catch (error) {
    if (__DEV__) {
      console.warn('[RemoteConfig] Módulo não encontrado, usando defaults.', error);
    }
    remoteConfigModule = null;
  }

  return remoteConfigModule;
}

export async function initRemoteConfig() {
  if (initialized) {
    return;
  }

  const rc = getRemoteConfigInstance();
  if (!rc) {
    initialized = true;
    return;
  }

  try {
    await rc.setConfigSettings({ minimumFetchIntervalMillis: 30 * 60 * 1000 });
    await rc.setDefaults(DEFAULTS);
    await rc.fetchAndActivate();
  } catch (error) {
    if (__DEV__) {
      console.warn('[RemoteConfig] Falha ao buscar/ativar, usando defaults.', error);
    }
  } finally {
    initialized = true;
    activationTried = true;
  }
}

function getBoolean(key: keyof typeof DEFAULTS) {
  const rc = getRemoteConfigInstance();
  if (!rc) {
    return Boolean(DEFAULTS[key]);
  }
  try {
    const value = rc.getValue(key as string);
    if (value && typeof value.asBoolean === 'function') {
      return value.asBoolean();
    }
  } catch {
    // ignored
  }
  return Boolean(DEFAULTS[key]);
}

function getNumber(key: keyof typeof DEFAULTS) {
  const rc = getRemoteConfigInstance();
  if (!rc) {
    return Number(DEFAULTS[key]);
  }
  try {
    const value = rc.getValue(key as string);
    if (value && typeof value.asNumber === 'function') {
      return value.asNumber();
    }
  } catch {
    // ignored
  }
  return Number(DEFAULTS[key]);
}

export function getInterstitialFrequency() {
  return getNumber('interstitial_frequency');
}

export function areAdsEnabled() {
  return getBoolean('enable_ads');
}

export function isFirstSessionAdsEnabled() {
  return getBoolean('ads_first_session_enabled');
}

export function hasRemoteConfigActivated() {
  return activationTried;
}
