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
  updateDoc,
} from 'firebase/firestore';

import { ModoJogo, ModoJogoConteudo, Pergunta } from '../models/game';
import { isModoJogoConteudo } from '../utils/gameModes';
import { parseFirebaseError } from '../utils/firebaseError';
import { getCurrentUid } from './authService';
import { getFirebaseFirestore } from './firebase';
import { getUserProfile } from './profileService';

export interface NovaPerguntaInput {
  titulo: string;
  opcaoA: string;
  opcaoB: string;
  modo: ModoJogoConteudo;
}

export type SugestaoStatus = 'pendente' | 'aprovada' | 'recusada';

export interface SugestaoPergunta {
  id: string;
  titulo: string;
  opcaoA: string;
  opcaoB: string;
  modoSugerido: ModoJogoConteudo;
  autorId: string;
  autorNome: string;
  status: SugestaoStatus;
  createdAtMs: number;
  updatedAtMs: number;
  reviewedAtMs: number | null;
}

export interface SugestaoInput {
  titulo?: string;
  opcaoA: string;
  opcaoB: string;
  modoSugerido: ModoJogoConteudo;
}

export interface SugestaoAtualizacaoInput {
  titulo: string;
  opcaoA: string;
  opcaoB: string;
  modoSugerido: ModoJogoConteudo;
}

function getCommunityDocId(pergunta: Pick<Pergunta, 'id' | 'modo'>): string {
  return `${pergunta.modo}__${pergunta.id}`;
}

function getFavoriteDocId(pergunta: Pick<Pergunta, 'id' | 'modo'>): string {
  return `${pergunta.modo}__${pergunta.id}`;
}

function normalizeSuggestionInput(input: SugestaoInput | SugestaoAtualizacaoInput) {
  const tituloRaw = input.titulo?.trim();
  const titulo = tituloRaw && tituloRaw.length > 0 ? tituloRaw : 'O que voce prefere?';
  const opcaoA = input.opcaoA.trim();
  const opcaoB = input.opcaoB.trim();

  if (titulo.length < 6) {
    throw new Error('Titulo muito curto.');
  }
  if (opcaoA.length < 3 || opcaoB.length < 3) {
    throw new Error('As opcoes precisam ter pelo menos 3 caracteres.');
  }

  return { titulo, opcaoA, opcaoB };
}

function mapSugestaoDoc(docId: string, raw: Record<string, unknown>): SugestaoPergunta | null {
  const modoSugerido = raw.modoSugerido;
  if (!modoSugerido || typeof modoSugerido !== 'string' || !isModoJogoConteudo(modoSugerido as ModoJogo)) {
    return null;
  }

  const statusRaw = raw.status;
  const status: SugestaoStatus =
    statusRaw === 'aprovada' || statusRaw === 'recusada' || statusRaw === 'pendente' ? statusRaw : 'pendente';

  const createdAt = raw.createdAt as { toMillis?: () => number } | undefined;
  const updatedAt = raw.updatedAt as { toMillis?: () => number } | undefined;
  const reviewedAt = raw.reviewedAt as { toMillis?: () => number } | undefined;

  return {
    id: docId,
    titulo: typeof raw.titulo === 'string' ? raw.titulo : 'O que voce prefere?',
    opcaoA: typeof raw.opcaoA === 'string' ? raw.opcaoA : '',
    opcaoB: typeof raw.opcaoB === 'string' ? raw.opcaoB : '',
    modoSugerido: modoSugerido as ModoJogoConteudo,
    autorId: typeof raw.autorId === 'string' ? raw.autorId : '',
    autorNome: typeof raw.autorNome === 'string' ? raw.autorNome : 'Anonimo',
    status,
    createdAtMs: createdAt?.toMillis?.() ?? 0,
    updatedAtMs: updatedAt?.toMillis?.() ?? 0,
    reviewedAtMs: reviewedAt?.toMillis?.() ?? null,
  };
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

export async function enviarSugestaoPergunta(input: SugestaoInput): Promise<void> {
  try {
    const db = getFirebaseFirestore();
    const uid = await getCurrentUid();
    const profile = await getUserProfile();
    const normalized = normalizeSuggestionInput(input);

    await addDoc(collection(db, 'sugestoes'), {
      titulo: normalized.titulo,
      opcaoA: normalized.opcaoA,
      opcaoB: normalized.opcaoB,
      modoSugerido: input.modoSugerido,
      autorId: uid,
      autorNome: profile?.displayName ?? `Anon-${uid.slice(-4)}`,
      status: 'pendente',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      reviewedAt: null,
    });
  } catch (error) {
    if (error instanceof Error && !('code' in (error as object))) {
      throw error;
    }
    throw new Error(parseFirebaseError(error));
  }
}

export async function buscarSugestoes(status?: SugestaoStatus): Promise<SugestaoPergunta[]> {
  try {
    const db = getFirebaseFirestore();
    const ref = collection(db, 'sugestoes');
    const snapshot = await getDocs(query(ref, orderBy('createdAt', 'desc'), limit(120)));

    const list = snapshot.docs
      .map((item) => mapSugestaoDoc(item.id, item.data() as Record<string, unknown>))
      .filter((item): item is SugestaoPergunta => Boolean(item));

    if (!status) {
      return list;
    }

    return list.filter((item) => item.status === status);
  } catch (error) {
    throw new Error(parseFirebaseError(error));
  }
}

export async function atualizarSugestaoPergunta(id: string, input: SugestaoAtualizacaoInput): Promise<void> {
  try {
    const normalized = normalizeSuggestionInput(input);
    const db = getFirebaseFirestore();
    await updateDoc(doc(db, 'sugestoes', id), {
      titulo: normalized.titulo,
      opcaoA: normalized.opcaoA,
      opcaoB: normalized.opcaoB,
      modoSugerido: input.modoSugerido,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (error instanceof Error && !('code' in (error as object))) {
      throw error;
    }
    throw new Error(parseFirebaseError(error));
  }
}

export async function recusarSugestaoPergunta(id: string): Promise<void> {
  try {
    const db = getFirebaseFirestore();
    const uid = await getCurrentUid();
    await updateDoc(doc(db, 'sugestoes', id), {
      status: 'recusada',
      reviewedAt: serverTimestamp(),
      reviewedBy: uid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    throw new Error(parseFirebaseError(error));
  }
}

export async function aprovarSugestaoPergunta(id: string, input?: SugestaoAtualizacaoInput): Promise<void> {
  try {
    const db = getFirebaseFirestore();
    const uid = await getCurrentUid();
    const suggestionRef = doc(db, 'sugestoes', id);
    const suggestionSnapshot = await getDoc(suggestionRef);

    if (!suggestionSnapshot.exists()) {
      throw new Error('Sugestao nao encontrada.');
    }

    const raw = suggestionSnapshot.data() as Record<string, unknown>;
    const mapped = mapSugestaoDoc(id, raw);
    if (!mapped) {
      throw new Error('Sugestao invalida.');
    }

    const mergedInput: SugestaoAtualizacaoInput = input ?? {
      titulo: mapped.titulo,
      opcaoA: mapped.opcaoA,
      opcaoB: mapped.opcaoB,
      modoSugerido: mapped.modoSugerido,
    };
    const normalized = normalizeSuggestionInput(mergedInput);

    const createdQuestion = await addDoc(collection(db, 'perguntas', mergedInput.modoSugerido, 'itens'), {
      titulo: normalized.titulo,
      opcaoA: normalized.opcaoA,
      opcaoB: normalized.opcaoB,
      createdAt: serverTimestamp(),
      source: 'sugestao',
      suggestionId: id,
    });

    await updateDoc(suggestionRef, {
      titulo: normalized.titulo,
      opcaoA: normalized.opcaoA,
      opcaoB: normalized.opcaoB,
      modoSugerido: mergedInput.modoSugerido,
      status: 'aprovada',
      approvedQuestionId: createdQuestion.id,
      reviewedAt: serverTimestamp(),
      reviewedBy: uid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (error instanceof Error && !('code' in (error as object))) {
      throw error;
    }
    throw new Error(parseFirebaseError(error));
  }
}
