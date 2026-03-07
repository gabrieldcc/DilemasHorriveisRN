import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let hasLoggedFirebaseReady = false;
let hasLoggedFirebaseError = false;

function ensureConfig() {
  const missing = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Firebase nao configurado. Campos faltando: ${missing.join(', ')}`);
  }
}

export function getFirebaseFirestore() {
  try {
    ensureConfig();
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    if (__DEV__ && !hasLoggedFirebaseReady) {
      console.info(`[Firebase] Integracao ativa. Projeto: ${firebaseConfig.projectId} | Firestore pronto.`);
      hasLoggedFirebaseReady = true;
    }
    return getFirestore(app);
  } catch (error) {
    if (__DEV__ && !hasLoggedFirebaseError) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido ao inicializar Firebase.';
      console.error(`[Firebase] Falha na inicializacao: ${message}`);
      hasLoggedFirebaseError = true;
    }
    throw error;
  }
}

export function getFirebaseAuth() {
  ensureConfig();
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return getAuth(app);
}
