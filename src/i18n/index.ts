import { getAppLanguage, getFallbackLanguage, SupportedAppLanguage } from '../services/languageService';
import { en, es, pt, TranslationKey } from './translations';

type Params = Record<string, string | number | boolean | null | undefined>;

const dictionaries: Record<SupportedAppLanguage, Record<TranslationKey, string>> = {
  pt,
  en,
  es,
};

function interpolate(template: string, params?: Params): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = params[key];
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  });
}

export function t(key: TranslationKey, params?: Params, language?: SupportedAppLanguage): string {
  const currentLanguage = language ?? getAppLanguage();
  const fallbackLanguage = getFallbackLanguage();

  const primary = dictionaries[currentLanguage]?.[key];
  if (primary) {
    return interpolate(primary, params);
  }

  const fallback = dictionaries[fallbackLanguage]?.[key];
  if (fallback) {
    return interpolate(fallback, params);
  }

  return key;
}

export function getLocaleTag(language?: SupportedAppLanguage): string {
  const currentLanguage = language ?? getAppLanguage();
  if (currentLanguage === 'pt') {
    return 'pt-BR';
  }
  if (currentLanguage === 'es') {
    return 'es-ES';
  }
  return 'en-US';
}

