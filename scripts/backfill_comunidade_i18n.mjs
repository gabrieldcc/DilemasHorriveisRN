import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, getFirestore, serverTimestamp, writeBatch } from 'firebase/firestore';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

function asNonEmptyString(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function localizedField(raw, field) {
  const result = {};
  const base = raw[field];

  if (base && typeof base === 'object' && !Array.isArray(base)) {
    const nested = base;
    const pt = asNonEmptyString(nested.pt ?? nested['pt-BR'] ?? nested.pt_BR ?? nested.ptbr);
    const en = asNonEmptyString(nested.en ?? nested['en-US'] ?? nested.en_US ?? nested.enus);
    const es = asNonEmptyString(nested.es ?? nested['es-ES'] ?? nested.es_ES ?? nested.eses);
    if (pt) result.pt = pt;
    if (en) result.en = en;
    if (es) result.es = es;
  }

  const flatPt = asNonEmptyString(raw[`${field}_pt`]) ?? asNonEmptyString(raw[`${field}Pt`]);
  const flatEn = asNonEmptyString(raw[`${field}_en`]) ?? asNonEmptyString(raw[`${field}En`]);
  const flatEs = asNonEmptyString(raw[`${field}_es`]) ?? asNonEmptyString(raw[`${field}Es`]);
  if (flatPt && !result.pt) result.pt = flatPt;
  if (flatEn && !result.en) result.en = flatEn;
  if (flatEs && !result.es) result.es = flatEs;

  return result;
}

function isLocalized(v) {
  return Boolean(v && typeof v === 'object' && (v.pt || v.en || v.es));
}

const app = initializeApp(config);
const auth = getAuth(app);
await signInAnonymously(auth);
const db = getFirestore(app);

const communitySnap = await getDocs(collection(db, 'comunidade_favoritas'));

let scanned = 0;
let updated = 0;
let skipped = 0;
let missingSource = 0;

let batch = writeBatch(db);
let batchOps = 0;

for (const item of communitySnap.docs) {
  scanned += 1;
  const raw = item.data();
  const modo = raw.modo;
  const questionId = raw.questionId;

  if (typeof modo !== 'string' || typeof questionId !== 'string') {
    skipped += 1;
    continue;
  }

  const alreadyLocalized =
    isLocalized(raw.titulo) &&
    isLocalized(raw.opcaoA) &&
    isLocalized(raw.opcaoB);
  if (alreadyLocalized) {
    skipped += 1;
    continue;
  }

  const sourceRef = doc(db, 'perguntas', modo, 'itens', questionId);
  const sourceSnap = await getDoc(sourceRef);

  if (!sourceSnap.exists()) {
    missingSource += 1;
    continue;
  }

  const sourceRaw = sourceSnap.data();
  const titulo = localizedField(sourceRaw, 'titulo');
  const opcaoA = localizedField(sourceRaw, 'opcaoA');
  const opcaoB = localizedField(sourceRaw, 'opcaoB');

  if (!isLocalized(titulo) || !isLocalized(opcaoA) || !isLocalized(opcaoB)) {
    skipped += 1;
    continue;
  }

  batch.set(
    doc(db, 'comunidade_favoritas', item.id),
    {
      titulo,
      opcaoA,
      opcaoB,
      i18nBackfilledAt: serverTimestamp(),
    },
    { merge: true }
  );
  batchOps += 1;
  updated += 1;

  if (batchOps >= 400) {
    await batch.commit();
    batch = writeBatch(db);
    batchOps = 0;
  }
}

if (batchOps > 0) {
  await batch.commit();
}

console.log(`SCANNED=${scanned}`);
console.log(`UPDATED=${updated}`);
console.log(`SKIPPED=${skipped}`);
console.log(`MISSING_SOURCE=${missingSource}`);
