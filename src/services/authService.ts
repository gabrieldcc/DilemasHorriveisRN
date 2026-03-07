import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInAnonymously } from 'firebase/auth';

import { getFirebaseAuth } from './firebase';

let pendingSignIn: Promise<string> | null = null;
const LOCAL_UID_KEY = '@dilemas/local-uid';

async function getOrCreateLocalUid(): Promise<string> {
  const existing = await AsyncStorage.getItem(LOCAL_UID_KEY);
  if (existing) {
    return existing;
  }

  const generated = `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(LOCAL_UID_KEY, generated);
  return generated;
}

export async function getCurrentUid(): Promise<string> {
  const auth = getFirebaseAuth();

  if (auth.currentUser?.uid) {
    return auth.currentUser.uid;
  }

  if (pendingSignIn) {
    return pendingSignIn;
  }

  pendingSignIn = (async () => {
    try {
      const credential = await signInAnonymously(auth);
      return credential.user.uid;
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'auth/configuration-not-found'
      ) {
        return getOrCreateLocalUid();
      }

      throw error;
    }
  })();

  try {
    return await pendingSignIn;
  } finally {
    pendingSignIn = null;
  }
}
