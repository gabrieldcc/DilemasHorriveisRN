import {
  addDoc,
  collection,
  deleteDoc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  doc,
} from 'firebase/firestore';

import { ModoJogo, Pergunta } from '../models/game';
import { isModoJogoConteudo } from '../utils/gameModes';
import { parseFirebaseError } from '../utils/firebaseError';
import { getCurrentUid } from './authService';
import { getFirebaseFirestore } from './firebase';
import { getUserProfile } from './profileService';

export interface ComentarioPergunta {
  id: string;
  texto: string;
  autorNome: string;
  createdAtMs: number;
  likeCount: number;
  likedByCurrentUser: boolean;
  canDelete: boolean;
}

function getComentariosCollectionPath(pergunta: Pergunta): [string, string, string, string] {
  if (!isModoJogoConteudo(pergunta.modo)) {
    throw new Error('Comentários só podem ser adicionados em perguntas de modos principais.');
  }

  return ['perguntas', pergunta.modo, 'itens', pergunta.id];
}

function getAuthorLabel(uid: string): string {
  return `Anon-${uid.slice(-4)}`;
}

export async function contarComentariosPergunta(pergunta: Pergunta): Promise<number> {
  try {
    const db = getFirebaseFirestore();
    const [root, modo, itens, questionId] = getComentariosCollectionPath(pergunta);
    const commentsRef = collection(db, root, modo, itens, questionId, 'comentarios');
    const snapshot = await getCountFromServer(commentsRef);
    return snapshot.data().count;
  } catch (error) {
    throw new Error(parseFirebaseError(error));
  }
}

export async function buscarComentariosPergunta(pergunta: Pergunta): Promise<ComentarioPergunta[]> {
  try {
    const db = getFirebaseFirestore();
    const uid = await getCurrentUid();
    const [root, modo, itens, questionId] = getComentariosCollectionPath(pergunta);
    const commentsRef = collection(db, root, modo, itens, questionId, 'comentarios');
    const commentsQuery = query(commentsRef, orderBy('createdAt', 'desc'), limit(60));
    const snapshot = await getDocs(commentsQuery);
    const likedEntries = await Promise.all(
      snapshot.docs.map(async (commentDoc) => {
        const likeRef = doc(db, root, modo, itens, questionId, 'comentarios', commentDoc.id, 'likes', uid);
        const likeSnapshot = await getDoc(likeRef);
        return [commentDoc.id, likeSnapshot.exists()] as const;
      })
    );
    const likedMap = new Map<string, boolean>(likedEntries);

    return snapshot.docs.map((commentDoc) => {
      const data = commentDoc.data() as {
        texto?: string;
        autorNome?: string;
        autorId?: string;
        createdAt?: { toMillis?: () => number };
        likeCount?: number;
      };

      return {
        id: commentDoc.id,
        texto: data.texto ?? '',
        autorNome: data.autorNome ?? 'Anônimo',
        createdAtMs: data.createdAt?.toMillis?.() ?? Date.now(),
        likeCount: data.likeCount ?? 0,
        likedByCurrentUser: likedMap.get(commentDoc.id) ?? false,
        canDelete: data.autorId === uid,
      };
    });
  } catch (error) {
    throw new Error(parseFirebaseError(error));
  }
}

export async function adicionarComentarioPergunta(pergunta: Pergunta, texto: string): Promise<void> {
  try {
    const normalized = texto.trim();
    if (normalized.length < 3) {
      throw new Error('Comentário muito curto.');
    }

    const db = getFirebaseFirestore();
    const uid = await getCurrentUid();
    const profile = await getUserProfile();
    const [root, modo, itens, questionId] = getComentariosCollectionPath(pergunta);
    const commentsRef = collection(db, root, modo, itens, questionId, 'comentarios');

    await addDoc(commentsRef, {
      texto: normalized,
      autorId: uid,
      autorNome: profile?.displayName ?? getAuthorLabel(uid),
      modo: pergunta.modo,
      questionId: pergunta.id,
      createdAt: serverTimestamp(),
      likeCount: 0,
    });
  } catch (error) {
    if (error instanceof Error && !('code' in (error as object))) {
      throw error;
    }
    throw new Error(parseFirebaseError(error));
  }
}

export async function alternarLikeComentario(pergunta: Pergunta, comentarioId: string): Promise<boolean> {
  try {
    const db = getFirebaseFirestore();
    const uid = await getCurrentUid();
    const [root, modo, itens, questionId] = getComentariosCollectionPath(pergunta);
    const commentRef = doc(db, root, modo, itens, questionId, 'comentarios', comentarioId);
    const likeRef = doc(db, root, modo, itens, questionId, 'comentarios', comentarioId, 'likes', uid);
    let isLiked = false;

    await runTransaction(db, async (transaction) => {
      const [commentSnapshot, likeSnapshot] = await Promise.all([transaction.get(commentRef), transaction.get(likeRef)]);

      if (!commentSnapshot.exists()) {
        throw new Error('Comentário não encontrado.');
      }

      const currentCount = (commentSnapshot.data().likeCount as number | undefined) ?? 0;

      if (likeSnapshot.exists()) {
        transaction.delete(likeRef);
        transaction.update(commentRef, { likeCount: Math.max(0, currentCount - 1) });
        isLiked = false;
        return;
      }

      transaction.set(likeRef, {
        uid,
        createdAt: serverTimestamp(),
      });
      transaction.update(commentRef, { likeCount: currentCount + 1 });
      isLiked = true;
    });

    return isLiked;
  } catch (error) {
    throw new Error(parseFirebaseError(error));
  }
}

export async function removerComentarioPergunta(pergunta: Pergunta, comentarioId: string): Promise<void> {
  try {
    const db = getFirebaseFirestore();
    const uid = await getCurrentUid();
    const [root, modo, itens, questionId] = getComentariosCollectionPath(pergunta);
    const commentRef = doc(db, root, modo, itens, questionId, 'comentarios', comentarioId);
    const commentSnapshot = await getDoc(commentRef);

    if (!commentSnapshot.exists()) {
      throw new Error('Comentário não encontrado.');
    }

    const autorId = commentSnapshot.data().autorId as string | undefined;
    if (autorId !== uid) {
      throw new Error('Você só pode excluir comentários criados por você.');
    }

    await deleteDoc(commentRef);
  } catch (error) {
    if (error instanceof Error && !('code' in (error as object))) {
      throw error;
    }
    throw new Error(parseFirebaseError(error));
  }
}
