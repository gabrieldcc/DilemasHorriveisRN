import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';

import { DEFAULT_FEATURE_FLAGS, FeatureFlags } from '../models/featureFlags';
import { parseFirebaseError } from '../utils/firebaseError';
import { getFirebaseFirestore } from './firebase';

const FEATURE_FLAGS_REF_PATH = ['config', 'feature_flags'] as const;

function sanitizeFlags(data: Record<string, unknown> | undefined): FeatureFlags {
  return {
    commentsEnabled:
      typeof data?.commentsEnabled === 'boolean' ? data.commentsEnabled : DEFAULT_FEATURE_FLAGS.commentsEnabled,
  };
}

export function subscribeFeatureFlags(
  onData: (flags: FeatureFlags) => void,
  onError?: (error: Error) => void
): () => void {
  const db = getFirebaseFirestore();
  const ref = doc(db, ...FEATURE_FLAGS_REF_PATH);

  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(DEFAULT_FEATURE_FLAGS);
        return;
      }

      onData(sanitizeFlags(snapshot.data() as Record<string, unknown>));
    },
    (error) => {
      const parsed = new Error(parseFirebaseError(error));
      onError?.(parsed);
    }
  );
}

export async function atualizarFeatureFlags(partial: Partial<FeatureFlags>): Promise<void> {
  try {
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
