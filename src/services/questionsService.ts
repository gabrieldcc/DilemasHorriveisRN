import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { ModoJogo, ModoJogoConteudo, Pergunta } from '../models/game';
import { isModoJogoConteudo } from '../utils/gameModes';
import { parseFirebaseError } from '../utils/firebaseError';
import { getCurrentUid } from './authService';
import { getFirebaseFirestore } from './firebase';

export interface NovaPerguntaInput {
  titulo: string;
  opcaoA: string;
  opcaoB: string;
  modo: ModoJogoConteudo;
}

function getCommunityDocId(pergunta: Pick<Pergunta, 'id' | 'modo'>): string {
  return `${pergunta.modo}__${pergunta.id}`;
}

function getFavoriteDocId(pergunta: Pick<Pergunta, 'id' | 'modo'>): string {
  return `${pergunta.modo}__${pergunta.id}`;
}

export async function buscarPerguntasPorModo(modo: ModoJogo): Promise<Pergunta[]> {
  try {
    if (modo === ModoJogo.favoritas) {
      return buscarPerguntasFavoritas();
    }

    if (modo === ModoJogo.comunidade) {
      return buscarPerguntasComunidade();
    }

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
    if (__DEV__) {
      console.error(`[Firestore] Falha ao buscar perguntas do modo "${modo}".`, error);
    }
    throw new Error(parseFirebaseError(error));
  }
}

async function buscarPerguntasFavoritas(): Promise<Pergunta[]> {
  const db = getFirebaseFirestore();
  const uid = await getCurrentUid();
  const favoritesRef = collection(db, 'users', uid, 'favoritos');
  const snapshot = await getDocs(query(favoritesRef, orderBy('createdAt', 'desc')));

  const mapped: Array<Pergunta | null> = snapshot.docs.map((favoriteDoc) => {
      const data = favoriteDoc.data() as {
        questionId: string;
        modo: ModoJogo;
        titulo: string;
        opcaoA: string;
        opcaoB: string;
      };

      if (!isModoJogoConteudo(data.modo)) {
        return null;
      }

      return {
        id: data.questionId,
        titulo: data.titulo,
        opcaoA: data.opcaoA,
        opcaoB: data.opcaoB,
        modo: data.modo,
      };
    });

  return mapped.filter((item): item is Pergunta => item !== null);
}

async function buscarPerguntasComunidade(): Promise<Pergunta[]> {
  const db = getFirebaseFirestore();
  const communityRef = collection(db, 'comunidade_favoritas');
  const snapshot = await getDocs(query(communityRef, orderBy('favoriteCount', 'desc'), limit(80)));

  const mapped: Array<Pergunta | null> = snapshot.docs.map((questionDoc) => {
      const data = questionDoc.data() as {
        titulo?: string;
        opcaoA?: string;
        opcaoB?: string;
        favoriteCount?: number;
        modo?: ModoJogo;
        questionId?: string;
      };

      const modeFromDoc = data.modo;

      if (!modeFromDoc || !isModoJogoConteudo(modeFromDoc)) {
        return null;
      }

      if ((data.favoriteCount ?? 0) <= 0) {
        return null;
      }

      if (!data.titulo || !data.opcaoA || !data.opcaoB) {
        return null;
      }

      return {
        id: data.questionId ?? questionDoc.id,
        titulo: data.titulo,
        opcaoA: data.opcaoA,
        opcaoB: data.opcaoB,
        modo: modeFromDoc,
      };
    });

  return mapped.filter((item): item is Pergunta => item !== null);
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
    if (!isModoJogoConteudo(modo)) {
      throw new Error('Modo invalido para remocao de pergunta.');
    }
    const db = getFirebaseFirestore();
    await deleteDoc(doc(db, 'perguntas', modo, 'itens', id));
  } catch (error) {
    throw new Error(parseFirebaseError(error));
  }
}

export async function isPerguntaFavorita(pergunta: Pergunta): Promise<boolean> {
  try {
    const db = getFirebaseFirestore();
    const uid = await getCurrentUid();
    const favoriteRef = doc(db, 'users', uid, 'favoritos', getFavoriteDocId(pergunta));
    const snapshot = await getDoc(favoriteRef);
    return snapshot.exists();
  } catch (error) {
    throw new Error(parseFirebaseError(error));
  }
}

export async function alternarPerguntaFavorita(pergunta: Pergunta): Promise<boolean> {
  try {
    if (!isModoJogoConteudo(pergunta.modo)) {
      throw new Error('Apenas perguntas dos modos principais podem ser favoritas.');
    }

    const db = getFirebaseFirestore();
    const uid = await getCurrentUid();
    const favoriteRef = doc(db, 'users', uid, 'favoritos', getFavoriteDocId(pergunta));
    const communityRef = doc(db, 'comunidade_favoritas', getCommunityDocId(pergunta));
    const favoriteSnapshot = await getDoc(favoriteRef);

    if (favoriteSnapshot.exists()) {
      await deleteDoc(favoriteRef);
      await runTransaction(db, async (transaction) => {
        const communitySnapshot = await transaction.get(communityRef);
        if (!communitySnapshot.exists()) {
          return;
        }

        const currentCount = (communitySnapshot.data().favoriteCount as number | undefined) ?? 0;
        if (currentCount <= 1) {
          transaction.delete(communityRef);
          return;
        }

        transaction.update(communityRef, {
          favoriteCount: currentCount - 1,
        });
      });
      return false;
    }

    await setDoc(favoriteRef, {
      questionId: pergunta.id,
      modo: pergunta.modo,
      titulo: pergunta.titulo,
      opcaoA: pergunta.opcaoA,
      opcaoB: pergunta.opcaoB,
      createdAt: serverTimestamp(),
    });
    await runTransaction(db, async (transaction) => {
      const communitySnapshot = await transaction.get(communityRef);
      const currentCount = (communitySnapshot.data()?.favoriteCount as number | undefined) ?? 0;
      transaction.set(
        communityRef,
        {
          questionId: pergunta.id,
          modo: pergunta.modo,
          titulo: pergunta.titulo,
          opcaoA: pergunta.opcaoA,
          opcaoB: pergunta.opcaoB,
          favoriteCount: currentCount + 1,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    });
    return true;
  } catch (error) {
    throw new Error(parseFirebaseError(error));
  }
}
