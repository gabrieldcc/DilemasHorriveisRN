const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to point to your service account JSON.');
  process.exit(1);
}

if (!process.env.FIRESTORE_PROJECT_ID) {
  console.error('Set FIRESTORE_PROJECT_ID when running this script.');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.FIRESTORE_PROJECT_ID,
  });
}

const db = admin.firestore();

const args = process.argv.slice(2);
const action = args[0];

if (!action || !['export', 'update'].includes(action)) {
  console.error('Usage: node scripts/sync-questions.js <export|update> [--out=path]');
  process.exit(1);
}

const opts = args.slice(1).reduce((acc, next) => {
  const [key, value] = next.split('=');
  if (key && value) acc[key.replace(/^--/, '')] = value;
  return acc;
}, {});

function normalizeLocalized(existing, fallback) {
  const localized = typeof existing === 'object' && existing !== null ? { ...existing } : {};
  if (!localized.en && fallback) localized.en = fallback;
  if (!localized.pt && fallback) localized.pt = fallback;
  if (!localized.es && fallback) localized.es = fallback;
  return localized;
}

async function listModes() {
  const modos = await db.collection('perguntas').listDocuments();
  return modos.map((doc) => doc.id);
}

async function exportQuestions(targetPath) {
  const modes = await listModes();
  const payload = [];
  for (const modo of modes) {
    const snapshot = await db.collection('perguntas').doc(modo).collection('itens').get();
    snapshot.forEach((doc) => {
      payload.push({
        modo,
        id: doc.id,
        data: doc.data(),
      });
    });
  }
  fs.writeFileSync(targetPath, JSON.stringify(payload, null, 2));
  console.log(`Exported ${payload.length} questions to ${targetPath}`);
}

async function ensureLocalizedFields() {
  const modes = await listModes();
  for (const modo of modes) {
    const snapshot = await db.collection('perguntas').doc(modo).collection('itens').get();
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const update = {};
      update.question = normalizeLocalized(data.question, typeof data.titulo === 'string' ? data.titulo : undefined);
      update.optionA = normalizeLocalized(data.optionA, typeof data.opcaoA === 'string' ? data.opcaoA : undefined);
      update.optionB = normalizeLocalized(data.optionB, typeof data.opcaoB === 'string' ? data.opcaoB : undefined);
      await doc.ref.set(update, { merge: true });
      console.log(`Updated ${modo}/${doc.id}`);
    }
  }
}

if (action === 'export') {
  const out = opts.out || path.join(process.cwd(), 'questions-export.json');
  exportQuestions(out).catch((error) => {
    console.error('Export failed', error);
    process.exit(1);
  });
} else if (action === 'update') {
  ensureLocalizedFields().catch((error) => {
    console.error('Update failed', error);
    process.exit(1);
  });
}
