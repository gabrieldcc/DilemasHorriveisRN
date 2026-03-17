import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

import en from './locales/en.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import { LocalizedText, LocaleCode } from '../models/game';

const resources = {
  en: { translation: en },
  pt: { translation: pt },
  es: { translation: es },
} as const;

export const DEFAULT_LOCALE: LocaleCode = 'en';
export const SUPPORTED_LOCALES: LocaleCode[] = ['en', 'pt', 'es'];

export function normalizeLocale(input?: string | null): LocaleCode {
  if (!input) {
    return DEFAULT_LOCALE;
  }

  const normalized = input.toLowerCase();
  if (normalized.startsWith('pt')) {
    return 'pt';
  }
  if (normalized.startsWith('es')) {
    return 'es';
  }
  return 'en';
}

export function detectDeviceLocale(): LocaleCode {
  const locale = Localization.getLocales?.()[0];
  return normalizeLocale(locale?.languageTag ?? locale?.languageCode);
}

let initialized = false;

export async function initI18n(): Promise<void> {
  if (initialized) {
    return;
  }

  await i18n.use(initReactI18next).init({
    resources,
    lng: detectDeviceLocale(),
    fallbackLng: DEFAULT_LOCALE,
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v4',
    returnNull: false,
  });

  initialized = true;
}

export function getCurrentLocale(): LocaleCode {
  return normalizeLocale(i18n.language);
}

export function getLocalizedTextSync(text?: LocalizedText | null, fallback = ''): string {
  if (!text) {
    return fallback;
  }

  const locale = getCurrentLocale();
  return text[locale]?.trim() || text.en?.trim() || fallback;
}

export function getLocalizedText(text?: LocalizedText | null, fallback = ''): string {
  return getLocalizedTextSync(text, fallback);
}

export function useAppTranslation() {
  const translation = useTranslation();
  return {
    ...translation,
    locale: getCurrentLocale(),
    getLocalizedText,
  };
}

export { i18n };

void initI18n();
