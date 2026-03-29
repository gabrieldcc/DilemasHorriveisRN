import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';

import { ModoJogo } from '../models/game';
import { getFirebaseFirestore } from './firebase';
import { SupportedAppLanguage } from './languageService';

const CACHE_PREFIX = '@dilemas/questions-cache';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CONTENT_VERSIONS_PATH = ['config', 'content_versions'] as const;

type CachedQuestionsPayload<T> = {
  version: number;
  savedAt: number;
  questions: T[];
};

let versionsCache: Partial<Record<ModoJogo, number>> | null = null;
let versionsFetchedAt = 0;
const VERSIONS_CACHE_TTL_MS = 60 * 1000;

function buildCacheKey(modo: ModoJogo, language: SupportedAppLanguage) {
  return `${CACHE_PREFIX}:${modo}:${language}`;
}

export async function getContentVersion(modo: ModoJogo): Promise<number> {
  const now = Date.now();
  if (versionsCache && now - versionsFetchedAt < VERSIONS_CACHE_TTL_MS) {
    return versionsCache[modo] ?? 0;
  }

  try {
    const db = getFirebaseFirestore();
    const snapshot = await getDoc(doc(db, ...CONTENT_VERSIONS_PATH));
    const raw = snapshot.exists() ? (snapshot.data() as Record<string, unknown>) : {};
    versionsCache = {};

    Object.values(ModoJogo).forEach((mode) => {
      const value = raw[mode];
      versionsCache![mode] = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    });

    versionsFetchedAt = now;
    return versionsCache[modo] ?? 0;
  } catch {
    return versionsCache?.[modo] ?? 0;
  }
}

export async function readCachedQuestions<T>(
  modo: ModoJogo,
  language: SupportedAppLanguage,
  version: number
): Promise<T[] | null> {
  try {
    const raw = await AsyncStorage.getItem(buildCacheKey(modo, language));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CachedQuestionsPayload<T>;
    if (!parsed || !Array.isArray(parsed.questions)) {
      return null;
    }

    if (parsed.version !== version) {
      return null;
    }

    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      return null;
    }

    return parsed.questions;
  } catch {
    return null;
  }
}

export async function writeCachedQuestions<T>(
  modo: ModoJogo,
  language: SupportedAppLanguage,
  version: number,
  questions: T[]
): Promise<void> {
  const payload: CachedQuestionsPayload<T> = {
    version,
    savedAt: Date.now(),
    questions,
  };

  await AsyncStorage.setItem(buildCacheKey(modo, language), JSON.stringify(payload));
}

export async function clearCachedQuestionsForMode(modo: ModoJogo): Promise<void> {
  const keys = (['pt', 'en', 'es'] as SupportedAppLanguage[]).map((language) => buildCacheKey(modo, language));
  await AsyncStorage.multiRemove(keys);
}

export function invalidateContentVersionsCache() {
  versionsCache = null;
  versionsFetchedAt = 0;
}
