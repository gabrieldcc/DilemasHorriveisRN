import { addDoc, collection, deleteDoc, doc, getDocs } from 'firebase/firestore';

import { ModoJogo, Pergunta } from '../models/game';
import { parseFirebaseError } from '../utils/firebaseError';
import { getFirebaseFirestore } from './firebase';

export interface NovaPerguntaInput {
  titulo: string;
  opcaoA: string;
  opcaoB: string;
  modo: ModoJogo;
}

export async function buscarPerguntasPorModo(modo: ModoJogo): Promise<Pergunta[]> {
  try {
    const db = getFirebaseFirestore();
    const questionsRef = collection(db, 'perguntas', modo, 'itens');
    const snapshot = await getDocs(questionsRef);

    return snapshot.docs.map((questionDoc) => {
      const data = questionDoc.data() as Omit<Pergunta, 'id' | 'modo'>;
      return {
        id: questionDoc.id,
        titulo: data.titulo,
        opcaoA: data.opcaoA,
        opcaoB: data.opcaoB,
        modo,
      };
    });
  } catch (error) {
    throw new Error(parseFirebaseError(error));
  }
}

export async function adicionarPergunta(input: NovaPerguntaInput): Promise<void> {
  try {
    const db = getFirebaseFirestore();
    const questionsRef = collection(db, 'perguntas', input.modo, 'itens');
    await addDoc(questionsRef, {
      titulo: input.titulo,
      opcaoA: input.opcaoA,
      opcaoB: input.opcaoB,
    });
  } catch (error) {
    throw new Error(parseFirebaseError(error));
  }
}

export async function removerPergunta(modo: ModoJogo, id: string): Promise<void> {
  try {
    const db = getFirebaseFirestore();
    await deleteDoc(doc(db, 'perguntas', modo, 'itens', id));
  } catch (error) {
    throw new Error(parseFirebaseError(error));
  }
}
