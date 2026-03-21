import { NativeModules, Platform } from 'react-native';

export type SupportedAppLanguage = 'pt' | 'en' | 'es';

const DEFAULT_LANGUAGE: SupportedAppLanguage = 'en';
const SUPPORTED_LANGUAGES: SupportedAppLanguage[] = ['pt', 'en', 'es'];

function readDeviceLocale(): string | null {
  try {
    const intlLocale = Intl.DateTimeFormat().resolvedOptions().locale;
    if (typeof intlLocale === 'string' && intlLocale.trim().length > 0) {
      return intlLocale;
    }
  } catch {
    // Ignora e tenta os caminhos nativos abaixo.
  }

  if (Platform.OS === 'ios') {
    const settings = NativeModules.SettingsManager?.settings;
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
  }

  const androidLocale = NativeModules.I18nManager?.localeIdentifier;
  if (typeof androidLocale === 'string' && androidLocale.trim().length > 0) {
    return androidLocale;
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

export function getAppLanguage(): SupportedAppLanguage {
  const locale = readDeviceLocale();
  return normalizeLanguage(locale);
}

export function getFallbackLanguage(): SupportedAppLanguage {
  return DEFAULT_LANGUAGE;
}
