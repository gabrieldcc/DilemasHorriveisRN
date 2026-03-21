import { getFallbackLanguage, SupportedAppLanguage } from '../services/languageService';

type GenericRecord = Record<string, unknown>;

const LOCALE_KEYS: Record<SupportedAppLanguage, string[]> = {
  pt: ['pt', 'pt-BR', 'pt_BR', 'ptbr'],
  en: ['en', 'en-US', 'en_US', 'enus'],
  es: ['es', 'es-ES', 'es_ES', 'eses'],
};

function isRecord(value: unknown): value is GenericRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const text = value.trim();
  return text.length > 0 ? text : null;
}

function pickByLanguage(record: GenericRecord, language: SupportedAppLanguage): string | null {
  for (const key of LOCALE_KEYS[language]) {
    const value = sanitizeText(record[key]);
    if (value) {
      return value;
    }
  }
  return null;
}

function getLanguageSuffix(language: SupportedAppLanguage): string {
  if (language === 'pt') {
    return 'Pt';
  }
  if (language === 'en') {
    return 'En';
  }
  return 'Es';
}

function pickFlatField(record: GenericRecord, baseField: string, language: SupportedAppLanguage): string | null {
  const suffix = getLanguageSuffix(language);
  const snakeCase = sanitizeText(record[`${baseField}_${language}`]);
  if (snakeCase) {
    return snakeCase;
  }

  const camelCase = sanitizeText(record[`${baseField}${suffix}`]);
  if (camelCase) {
    return camelCase;
  }

  return null;
}

export function resolveLocalizedField(record: GenericRecord, baseField: string, language: SupportedAppLanguage): string | null {
  const fromFlatField = pickFlatField(record, baseField, language);
  if (fromFlatField) {
    return fromFlatField;
  }

  const fallbackLanguage = getFallbackLanguage();
  if (language !== fallbackLanguage) {
    const fromFlatFallback = pickFlatField(record, baseField, fallbackLanguage);
    if (fromFlatFallback) {
      return fromFlatFallback;
    }
  }

  const baseValue = record[baseField];
  if (isRecord(baseValue)) {
    const byRequestedLanguage = pickByLanguage(baseValue, language);
    if (byRequestedLanguage) {
      return byRequestedLanguage;
    }

    if (language !== fallbackLanguage) {
      const byFallbackLanguage = pickByLanguage(baseValue, fallbackLanguage);
      if (byFallbackLanguage) {
        return byFallbackLanguage;
      }
    }

    const byPortuguese = pickByLanguage(baseValue, 'pt');
    if (byPortuguese) {
      return byPortuguese;
    }
  }

  const legacyValue = sanitizeText(baseValue);
  if (legacyValue) {
    return legacyValue;
  }

  return null;
}
