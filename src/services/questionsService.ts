import { get, push, ref, remove, set } from 'firebase/database';

import { ModoJogo, Pergunta } from '../models/game';
import { parseFirebaseError } from '../utils/firebaseError';
import { getFirebaseDatabase } from './firebase';

export interface NovaPerguntaInput {
  titulo: string;
  opcaoA: string;
  opcaoB: string;
  modo: ModoJogo;
}

export async function buscarPerguntasPorModo(modo: ModoJogo): Promise<Pergunta[]> {
  try {
    const db = getFirebaseDatabase();
    const snapshot = await get(ref(db, `perguntas/${modo}`));

    if (!snapshot.exists()) {
      return [];
    }

    const raw = snapshot.val() as Record<string, Omit<Pergunta, 'id' | 'modo'>>;

    return Object.entries(raw).map(([id, item]) => ({
      id,
      titulo: item.titulo,
      opcaoA: item.opcaoA,
      opcaoB: item.opcaoB,
      modo,
    }));
  } catch (error) {
    throw new Error(parseFirebaseError(error));
  }
}

export async function adicionarPergunta(input: NovaPerguntaInput): Promise<void> {
  try {
    const db = getFirebaseDatabase();
    const perguntasRef = ref(db, `perguntas/${input.modo}`);
    const newRef = push(perguntasRef);

    await set(newRef, {
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
    const db = getFirebaseDatabase();
    await remove(ref(db, `perguntas/${modo}/${id}`));
  } catch (error) {
    throw new Error(parseFirebaseError(error));
  }
}
