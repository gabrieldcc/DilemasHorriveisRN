import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { collection, getDocs, getFirestore } from 'firebase/firestore';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(config);
const auth = getAuth(app);
await signInAnonymously(auth);
const db = getFirestore(app);

const snap = await getDocs(collection(db, 'perguntas', 'pesado', 'itens'));
let ok = 0;
let fail = 0;
for (const d of snap.docs) {
  const raw = d.data();
  const valid = ['titulo', 'opcaoA', 'opcaoB'].every((k) => {
    const v = raw[k];
    return v && typeof v === 'object' && typeof v.pt === 'string' && typeof v.en === 'string' && typeof v.es === 'string';
  });
  if (valid) ok += 1;
  else {
    fail += 1;
    console.log(`INVALID_DOC=${d.id}`);
  }
}

console.log(`TOTAL=${snap.size}`);
console.log(`VALID_I18N=${ok}`);
console.log(`INVALID_I18N=${fail}`);
