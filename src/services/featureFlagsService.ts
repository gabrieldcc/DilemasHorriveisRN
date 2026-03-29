import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { DEFAULT_FEATURE_FLAGS, FeatureFlags } from '../models/featureFlags';
import { parseFirebaseError } from '../utils/firebaseError';
import { getCurrentUid } from './authService';
import { getFirebaseFirestore } from './firebase';

const FEATURE_FLAGS_REF_PATH = ['config', 'feature_flags'] as const;

function resolveBooleanFlag(data: Record<string, unknown> | undefined, key: keyof FeatureFlags): boolean {
  return typeof data?.[key] === 'boolean' ? (data[key] as boolean) : DEFAULT_FEATURE_FLAGS[key];
}

function sanitizeFlags(data: Record<string, unknown> | undefined): FeatureFlags {
  return {
    commentsEnabled: resolveBooleanFlag(data, 'commentsEnabled'),
    suggestButtonEnabled: resolveBooleanFlag(data, 'suggestButtonEnabled'),
    modeLeveEnabled: resolveBooleanFlag(data, 'modeLeveEnabled'),
    modePesadoEnabled: resolveBooleanFlag(data, 'modePesadoEnabled'),
    modeNerdEnabled: resolveBooleanFlag(data, 'modeNerdEnabled'),
    modeCulturaBREnabled: resolveBooleanFlag(data, 'modeCulturaBREnabled'),
    modeAdultosEnabled: resolveBooleanFlag(data, 'modeAdultosEnabled'),
    modeFavoritasEnabled: resolveBooleanFlag(data, 'modeFavoritasEnabled'),
    modeComunidadeEnabled: resolveBooleanFlag(data, 'modeComunidadeEnabled'),
  };
}

export async function fetchFeatureFlags(): Promise<FeatureFlags> {
  try {
    const db = getFirebaseFirestore();
    const ref = doc(db, ...FEATURE_FLAGS_REF_PATH);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      return DEFAULT_FEATURE_FLAGS;
    }

    return sanitizeFlags(snapshot.data() as Record<string, unknown>);
  } catch (error) {
    throw new Error(parseFirebaseError(error));
  }
}

export async function atualizarFeatureFlags(partial: Partial<FeatureFlags>): Promise<void> {
  try {
    await getCurrentUid();
    const db = getFirebaseFirestore();
    const ref = doc(db, ...FEATURE_FLAGS_REF_PATH);
    await setDoc(
      ref,
      {
        ...partial,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    throw new Error(parseFirebaseError(error));
  }
}
