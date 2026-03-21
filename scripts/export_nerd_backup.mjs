import fs from 'node:fs/promises';
import path from 'node:path';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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
const snap = await getDocs(collection(db, 'perguntas', 'nerd', 'itens'));
const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

const now = new Date();
const stamp = now.toISOString().replace(/:/g, '-');
const outDir = path.join(process.cwd(), 'backups');
await fs.mkdir(outDir, { recursive: true });
const outPath = path.join(outDir, `nerd-questions-backup-${stamp}.json`);

await fs.writeFile(
  outPath,
  JSON.stringify(
    {
      exportedAt: now.toISOString(),
      count: docs.length,
      docs,
    },
    null,
    2
  ),
  'utf8'
);

console.log(`BACKUP_PATH=${outPath}`);
console.log(`DOC_COUNT=${docs.length}`);
