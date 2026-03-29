import fs from 'node:fs/promises';
import path from 'node:path';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { collection, doc, getDocs, getFirestore, writeBatch } from 'firebase/firestore';

const TRANSLATIONS = {
  'Voce prefere?': { en: 'Would you rather?', es: '¿Que prefieres?' },
  'O que e pior?': { en: "What's worse?", es: '¿Que es peor?' },

  'Seu amigo de trabalho ser o Dwight': {
    en: 'Your coworker is Dwight',
    es: 'Que tu companero de trabajo sea Dwight',
  },
  'Seu chefe ser o Michael Scott': {
    en: 'Your boss is Michael Scott',
    es: 'Que tu jefe sea Michael Scott',
  },
  'Destruir todas as pesquisas que poderiam recriar dinossauros como em Jurassic Park para evitar qualquer risco futuro': {
    en: 'Destroy all research that could recreate dinosaurs like in Jurassic Park to avoid any future risk',
    es: 'Destruir toda la investigacion que podria recrear dinosaurios como en Jurassic Park para evitar cualquier riesgo futuro',
  },
  'Permitir que a ciencia continue, sabendo que um erro pode causar uma catastrofe global': {
    en: 'Allow science to continue, knowing that one mistake could cause a global catastrophe',
    es: 'Permitir que la ciencia continue, sabiendo que un error puede causar una catastrofe global',
  },
  'Ter que andar para tras como no moonwalk do Michael Jackson para sempre': {
    en: "Have to walk backward like Michael Jackson's moonwalk forever",
    es: 'Tener que caminar hacia atras como el moonwalk de Michael Jackson para siempre',
  },
  'Ter que falar hee-hee no meio de toda conversa seria': {
    en: "Have to say 'hee-hee' in the middle of every serious conversation",
    es: "Tener que decir 'hee-hee' en medio de toda conversacion seria",
  },
  'Ter os poderes do Spider-Man, mas rasgar todas as suas roupas toda vez que usar': {
    en: 'Have Spider-Man powers but tear all your clothes every time you use them',
    es: 'Tener los poderes de Spider-Man, pero romper toda tu ropa cada vez que los uses',
  },
  'Ter que esconder sua identidade secreta de absolutamente todo mundo': {
    en: 'Have to hide your secret identity from absolutely everyone',
    es: 'Tener que esconder tu identidad secreta de absolutamente todo el mundo',
  },
  'Fazer o que Walter White fez para garantir o futuro financeiro da sua familia': {
    en: "Do what Walter White did to secure your family's financial future",
    es: 'Hacer lo que hizo Walter White para asegurar el futuro financiero de tu familia',
  },
  'Permanecer honesto e ver sua familia sofrer com dificuldades que voce poderia ter evitado': {
    en: 'Stay honest and watch your family suffer hardships you could have avoided',
    es: 'Permanecer honesto y ver a tu familia sufrir dificultades que podrias haber evitado',
  },
  'Assistir apenas a filmes de Quentin Tarantino para sempre': {
    en: 'Watch only Quentin Tarantino movies forever',
    es: 'Ver solo peliculas de Quentin Tarantino para siempre',
  },
  'Assistir apenas a filmes de Christopher Nolan para sempre': {
    en: 'Watch only Christopher Nolan movies forever',
    es: 'Ver solo peliculas de Christopher Nolan para siempre',
  },
  'Tomar a mesma decisao de Joel Miller em The Last of Us para salvar alguem que voce ama': {
    en: 'Make the same choice Joel Miller made in The Last of Us to save someone you love',
    es: 'Tomar la misma decision de Joel Miller en The Last of Us para salvar a alguien que amas',
  },
  'Permitir o sacrificio dessa pessoa para que a humanidade tenha uma chance de cura': {
    en: 'Allow that person to be sacrificed so humanity has a chance for a cure',
    es: 'Permitir el sacrificio de esa persona para que la humanidad tenga una oportunidad de cura',
  },
  'Libertar toda a humanidade da simulacao como em The Matrix, mesmo sabendo que bilhoes sofreriam ao descobrir a realidade': {
    en: 'Free all humanity from the simulation like in The Matrix, even knowing billions would suffer when discovering reality',
    es: 'Liberar a toda la humanidad de la simulacion como en The Matrix, aun sabiendo que miles de millones sufririan al descubrir la realidad',
  },
  'Manter todos vivendo felizes na simulacao, escondendo a verdade para sempre': {
    en: 'Keep everyone living happily in the simulation, hiding the truth forever',
    es: 'Mantener a todos viviendo felices en la simulacion, ocultando la verdad para siempre',
  },
  'Saber todos os segredos do mundo como se tivesse a mente do Professor X, mas nunca poder contar a verdade completa para ninguem': {
    en: "Know all the world's secrets as if you had Professor X's mind, but never be able to tell the whole truth to anyone",
    es: 'Saber todos los secretos del mundo como si tuvieras la mente del Profesor X, pero nunca poder contar la verdad completa a nadie',
  },
  'Conseguir convencer qualquer pessoa de qualquer coisa como o Loki, mas nunca mais saber se alguem esta sendo sincero com voce': {
    en: 'Convince anyone of anything like Loki, but never know again if someone is being honest with you',
    es: 'Convencer a cualquier persona de cualquier cosa como Loki, pero nunca volver a saber si alguien esta siendo sincero contigo',
  },
  'Lady Gaga': { en: 'Lady Gaga', es: 'Lady Gaga' },
  'Beyonce': { en: 'Beyonce', es: 'Beyonce' },
  'Ter o poder de apagar qualquer pessoa da existencia como o Thanos, mas perder uma memoria importante sua toda vez que usar': {
    en: 'Have the power to erase anyone from existence like Thanos, but lose an important memory every time you use it',
    es: 'Tener el poder de borrar a cualquier persona de la existencia como Thanos, pero perder un recuerdo importante cada vez que lo uses',
  },
  'Ter o poder de salvar qualquer pessoa da morte, mas alguem aleatorio no mundo morrer sempre que voce usar': {
    en: 'Have the power to save anyone from death, but a random person in the world dies every time you use it',
    es: 'Tener el poder de salvar a cualquier persona de la muerte, pero una persona aleatoria en el mundo muere cada vez que lo uses',
  },
  Friends: { en: 'Friends', es: 'Friends' },
  'How I Met Your Mother': { en: 'How I Met Your Mother', es: 'How I Met Your Mother' },
  'Harry Potter': { en: 'Harry Potter', es: 'Harry Potter' },
  'O Senhor dos Aneis': { en: 'The Lord of the Rings', es: 'El Senor de los Anillos' },
  'Ter a inteligencia de Tony Stark e criar tecnologia que poderia salvar milhoes, mas governos usarem tudo para guerra': {
    en: 'Have Tony Stark-level intelligence and create technology that could save millions, but governments use it all for war',
    es: 'Tener la inteligencia de Tony Stark y crear tecnologia que podria salvar a millones, pero que los gobiernos lo usen todo para la guerra',
  },
  'Destruir todas as tecnologias perigosas do mundo, mas impedir descobertas que poderiam curar doencas': {
    en: 'Destroy all dangerous technologies in the world, but prevent discoveries that could cure diseases',
    es: 'Destruir todas las tecnologias peligrosas del mundo, pero impedir descubrimientos que podrian curar enfermedades',
  },
  'Taylor Swift': { en: 'Taylor Swift', es: 'Taylor Swift' },
  'Britney Spears': { en: 'Britney Spears', es: 'Britney Spears' },
  'Ser convidado para Hogwarts': { en: 'Be invited to Hogwarts', es: 'Ser invitado a Hogwarts' },
  'Morar em Hawkins e ser amigo das criancas de Stranger Things': {
    en: 'Live in Hawkins and be friends with the Stranger Things kids',
    es: 'Vivir en Hawkins y ser amigo de los ninos de Stranger Things',
  },
  'Filmes de terror': { en: 'Horror movies', es: 'Peliculas de terror' },
  'Comedias romanticas': { en: 'Romantic comedies', es: 'Comedias romanticas' },

  'Teste i18n: qual superpoder voce escolheria?': {
    en: 'i18n test: which superpower would you choose?',
    es: 'prueba i18n: que superpoder elegirias?',
  },
  Teletransporte: { en: 'Teleportation', es: 'Teletransportacion' },
  Invisibilidade: { en: 'Invisibility', es: 'Invisibilidad' },
};

function normalize(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toLocalized(fieldValue, fieldName, docId) {
  if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
    const pt = typeof fieldValue.pt === 'string' ? fieldValue.pt : null;
    const en = typeof fieldValue.en === 'string' ? fieldValue.en : null;
    const es = typeof fieldValue.es === 'string' ? fieldValue.es : null;

    if (pt && en && es) {
      return { pt, en, es };
    }

    if (!pt) {
      throw new Error(`Doc ${docId}: campo ${fieldName} em objeto sem pt.`);
    }

    const lookup = TRANSLATIONS[normalize(pt)];
    if (!lookup) {
      throw new Error(`Doc ${docId}: sem traducao para ${fieldName}: ${pt}`);
    }

    return {
      pt,
      en: en ?? lookup.en,
      es: es ?? lookup.es,
    };
  }

  if (typeof fieldValue !== 'string' || fieldValue.trim().length === 0) {
    throw new Error(`Doc ${docId}: campo ${fieldName} invalido.`);
  }

  const pt = fieldValue;
  const lookup = TRANSLATIONS[normalize(pt)];
  if (!lookup) {
    throw new Error(`Doc ${docId}: sem traducao para ${fieldName}: ${pt}`);
  }

  return {
    pt,
    en: lookup.en,
    es: lookup.es,
  };
}

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

const translatedDocs = snap.docs.map((item) => {
  const raw = item.data();
  const titulo = toLocalized(raw.titulo, 'titulo', item.id);
  const opcaoA = toLocalized(raw.opcaoA, 'opcaoA', item.id);
  const opcaoB = toLocalized(raw.opcaoB, 'opcaoB', item.id);

  return {
    id: item.id,
    titulo,
    opcaoA,
    opcaoB,
  };
});

const now = new Date();
const stamp = now.toISOString().replace(/:/g, '-');
const transformedPath = path.join(process.cwd(), 'backups', `nerd-questions-translated-${stamp}.json`);
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

const batch = writeBatch(db);
for (const question of translatedDocs) {
  const ref = doc(db, 'perguntas', 'nerd', 'itens', question.id);
  batch.set(
    ref,
    {
      titulo: question.titulo,
      opcaoA: question.opcaoA,
      opcaoB: question.opcaoB,
      i18nUpdatedAt: now.toISOString(),
      i18nSource: 'codex_manual_translation',
    },
    { merge: true }
  );
}

await batch.commit();

console.log(`TRANSLATED_PATH=${transformedPath}`);
console.log(`UPDATED_COUNT=${translatedDocs.length}`);
