import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

export type SupportedAppLanguage = 'pt' | 'en' | 'es';

const DEFAULT_LANGUAGE: SupportedAppLanguage = 'en';
const SUPPORTED_LANGUAGES: SupportedAppLanguage[] = ['pt', 'en', 'es'];
const LANGUAGE_OVERRIDE_KEY = 'app_language_override';
const AUTO_LANGUAGE = 'auto';

let languageOverride: SupportedAppLanguage | null = null;
let hasHydratedLanguageOverride = false;

function readSettingsManagerLocale(): string | null {
  const settingsManager = NativeModules.SettingsManager;
  const settings = settingsManager?.settings ?? settingsManager?.getConstants?.().settings;
  const appleLocale = settings?.AppleLocale;
  if (typeof appleLocale === 'string' && appleLocale.trim().length > 0) {
    return appleLocale;
  }

  const appleLanguages = settings?.AppleLanguages;
  if (Array.isArray(appleLanguages) && appleLanguages.length > 0) {
    const primaryLanguage = appleLanguages[0];
    if (typeof primaryLanguage === 'string' && primaryLanguage.trim().length > 0) {
      return primaryLanguage;
    }
  }

  return null;
}

function readI18nManagerLocale(): string | null {
  const i18nManager = NativeModules.I18nManager;
  const localeIdentifier = i18nManager?.localeIdentifier ?? i18nManager?.getConstants?.().localeIdentifier;
  if (typeof localeIdentifier === 'string' && localeIdentifier.trim().length > 0) {
    return localeIdentifier;
  }

  return null;
}

function readDeviceLocale(): string | null {
  if (Platform.OS === 'ios') {
    const iosLocale = readSettingsManagerLocale();
    if (iosLocale) {
      return iosLocale;
    }
  }

  const i18nLocale = readI18nManagerLocale();
  if (i18nLocale) {
    return i18nLocale;
  }

  try {
    const intlLocale = Intl.DateTimeFormat().resolvedOptions().locale;
    if (typeof intlLocale === 'string' && intlLocale.trim().length > 0) {
      return intlLocale;
    }
  } catch {
    // Ignora e usa o fallback abaixo.
  }

  return null;
}

function normalizeLanguage(locale: string | null): SupportedAppLanguage {
  if (!locale) {
    return DEFAULT_LANGUAGE;
  }

  const baseLanguage = locale.split(/[-_]/)[0]?.toLowerCase();
  if (baseLanguage && SUPPORTED_LANGUAGES.includes(baseLanguage as SupportedAppLanguage)) {
    return baseLanguage as SupportedAppLanguage;
  }

  return DEFAULT_LANGUAGE;
}

function normalizeOverride(value: string | null): SupportedAppLanguage | null {
  if (!value || value === AUTO_LANGUAGE) {
    return null;
  }

  return SUPPORTED_LANGUAGES.includes(value as SupportedAppLanguage)
    ? (value as SupportedAppLanguage)
    : null;
}

export async function hydrateLanguageOverride(): Promise<void> {
  if (hasHydratedLanguageOverride) {
    return;
  }

  try {
    const storedValue = await AsyncStorage.getItem(LANGUAGE_OVERRIDE_KEY);
    languageOverride = normalizeOverride(storedValue);
  } catch {
    languageOverride = null;
  } finally {
    hasHydratedLanguageOverride = true;
  }
}

export async function setLanguageOverride(language: SupportedAppLanguage | null): Promise<void> {
  languageOverride = language;
  hasHydratedLanguageOverride = true;

  if (language) {
    await AsyncStorage.setItem(LANGUAGE_OVERRIDE_KEY, language);
    return;
  }

  await AsyncStorage.removeItem(LANGUAGE_OVERRIDE_KEY);
}

export function getLanguageOverride(): SupportedAppLanguage | null {
  return languageOverride;
}

export function getAppLanguage(): SupportedAppLanguage {
  if (languageOverride) {
    return languageOverride;
  }

  const locale = readDeviceLocale();
  if (__DEV__) {
    const settingsManager = NativeModules.SettingsManager;
    const settings = settingsManager?.settings ?? settingsManager?.getConstants?.().settings;
    const i18nConstants = NativeModules.I18nManager?.getConstants?.();
    console.info('[i18n] locale debug', {
      platform: Platform.OS,
      resolvedLocale: locale,
      intlLocale: (() => {
        try {
          return Intl.DateTimeFormat().resolvedOptions().locale;
        } catch {
          return null;
        }
      })(),
      settingsAppleLocale: settings?.AppleLocale ?? null,
      settingsAppleLanguages: settings?.AppleLanguages ?? null,
      i18nLocaleIdentifier: NativeModules.I18nManager?.localeIdentifier ?? null,
      i18nConstantsLocaleIdentifier: i18nConstants?.localeIdentifier ?? null,
    });
  }
  return normalizeLanguage(locale);
}

export function getFallbackLanguage(): SupportedAppLanguage {
  return DEFAULT_LANGUAGE;
}

export function getLanguageOptions(): Array<SupportedAppLanguage | typeof AUTO_LANGUAGE> {
  return [AUTO_LANGUAGE, ...SUPPORTED_LANGUAGES];
}
