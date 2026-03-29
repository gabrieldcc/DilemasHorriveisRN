import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { DEFAULT_FEATURE_FLAGS, FeatureFlags } from '../models/featureFlags';
import { parseFirebaseError } from '../utils/firebaseError';
import { getCurrentUid } from './authService';
import { getFirebaseFirestore } from './firebase';

const FEATURE_FLAGS_REF_PATH = ['config', 'feature_flags'] as const;

function sanitizeFlags(data: Record<string, unknown> | undefined): FeatureFlags {
  return {
    commentsEnabled:
      typeof data?.commentsEnabled === 'boolean' ? data.commentsEnabled : DEFAULT_FEATURE_FLAGS.commentsEnabled,
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
