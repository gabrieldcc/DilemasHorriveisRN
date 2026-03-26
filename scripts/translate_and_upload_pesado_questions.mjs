import fs from 'node:fs/promises';
import path from 'node:path';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { collection, doc, getDocs, getFirestore, writeBatch } from 'firebase/firestore';

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

const translateCache = new Map();

async function translateText(text, target) {
  const key = `${target}::${text}`;
  const cached = translateCache.get(key);
  if (cached) {
    return cached;
  }

  const params = new URLSearchParams({
    client: 'gtx',
    sl: 'pt',
    tl: target,
    dt: 't',
    q: text,
  });

  const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Falha na traducao (${response.status}) para idioma ${target}.`);
  }

  const payload = await response.json();
  const chunks = Array.isArray(payload?.[0]) ? payload[0] : [];
  const translated = chunks.map((part) => (Array.isArray(part) ? part[0] : '')).join('').trim();
  if (!translated) {
    throw new Error(`Traducao vazia para idioma ${target}.`);
  }

  translateCache.set(key, translated);
  return translated;
}

async function toLocalized(fieldValue, fieldName, docId) {
  if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
    const pt = typeof fieldValue.pt === 'string' ? fieldValue.pt.trim() : '';
    const enExisting = typeof fieldValue.en === 'string' ? fieldValue.en.trim() : '';
    const esExisting = typeof fieldValue.es === 'string' ? fieldValue.es.trim() : '';

    if (!pt) {
      throw new Error(`Doc ${docId}: campo ${fieldName} em objeto sem pt.`);
    }

    const en = enExisting || (await translateText(pt, 'en'));
    const es = esExisting || (await translateText(pt, 'es'));

    return { pt, en, es };
  }

  if (typeof fieldValue !== 'string' || fieldValue.trim().length === 0) {
    throw new Error(`Doc ${docId}: campo ${fieldName} invalido.`);
  }

  const pt = fieldValue.trim();
  const en = await translateText(pt, 'en');
  const es = await translateText(pt, 'es');
  return { pt, en, es };
}

const snap = await getDocs(collection(db, 'perguntas', 'pesado', 'itens'));
const translatedDocs = [];

for (const item of snap.docs) {
  const raw = item.data();
  const titulo = await toLocalized(raw.titulo, 'titulo', item.id);
  const opcaoA = await toLocalized(raw.opcaoA, 'opcaoA', item.id);
  const opcaoB = await toLocalized(raw.opcaoB, 'opcaoB', item.id);
  translatedDocs.push({ id: item.id, titulo, opcaoA, opcaoB });
}

const now = new Date();
const stamp = now.toISOString().replace(/:/g, '-');
const transformedPath = path.join(process.cwd(), 'backups', `pesado-questions-translated-${stamp}.json`);
await fs.writeFile(
  transformedPath,
  JSON.stringify(
    {
      generatedAt: now.toISOString(),
      count: translatedDocs.length,
      docs: translatedDocs,
    },
    null,
    2
  ),
  'utf8'
);

let updatedCount = 0;
for (let i = 0; i < translatedDocs.length; i += 400) {
  const slice = translatedDocs.slice(i, i + 400);
  const batch = writeBatch(db);
  for (const question of slice) {
    const ref = doc(db, 'perguntas', 'pesado', 'itens', question.id);
    batch.set(
      ref,
      {
        titulo: question.titulo,
        opcaoA: question.opcaoA,
        opcaoB: question.opcaoB,
        i18nUpdatedAt: now.toISOString(),
        i18nSource: 'codex_auto_translation',
      },
      { merge: true }
    );
    updatedCount += 1;
  }
  await batch.commit();
}

console.log(`TRANSLATED_PATH=${transformedPath}`);
console.log(`UPDATED_COUNT=${updatedCount}`);
