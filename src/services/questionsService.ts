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
import { getAppLanguage } from './languageService';
import { isModoJogoConteudo } from '../utils/gameModes';
import { resolveLocalizedField } from '../utils/localizedText';
import { parseFirebaseError } from '../utils/firebaseError';
import { getCurrentUid } from './authService';
import { getFirebaseFirestore } from './firebase';
import { getUserProfile } from './profileService';
import { t } from '../i18n';

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

function mapPerguntaDoc(
  raw: Record<string, unknown>,
  language: ReturnType<typeof getAppLanguage>,
  fallbackId: string,
  modo: ModoJogo
): Pergunta {
  const titulo = resolveLocalizedField(raw, 'titulo', language) ?? t('common.questionUnavailable');
  const opcaoA = resolveLocalizedField(raw, 'opcaoA', language) ?? t('common.optionAUnavailable');
  const opcaoB = resolveLocalizedField(raw, 'opcaoB', language) ?? t('common.optionBUnavailable');

  return {
    id: typeof raw.id === 'string' ? raw.id : fallbackId,
    titulo,
    opcaoA,
    opcaoB,
    modo,
  };
}

function getCommunityDocId(pergunta: Pick<Pergunta, 'id' | 'modo'>): string {
  return `${pergunta.modo}__${pergunta.id}`;
}

function getFavoriteDocId(pergunta: Pick<Pergunta, 'id' | 'modo'>): string {
  return `${pergunta.modo}__${pergunta.id}`;
}

function normalizeSuggestionInput(input: SugestaoInput | SugestaoAtualizacaoInput) {
  const tituloRaw = input.titulo?.trim();
  const titulo = tituloRaw && tituloRaw.length > 0 ? tituloRaw : t('common.defaultQuestionTitle');
  const opcaoA = input.opcaoA.trim();
  const opcaoB = input.opcaoB.trim();

  if (titulo.length < 6) {
    throw new Error(t('error.question.shortTitle'));
  }
  if (opcaoA.length < 3 || opcaoB.length < 3) {
    throw new Error(t('error.question.shortOptions'));
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
    titulo: typeof raw.titulo === 'string' ? raw.titulo : t('common.defaultQuestionTitle'),
    opcaoA: typeof raw.opcaoA === 'string' ? raw.opcaoA : '',
    opcaoB: typeof raw.opcaoB === 'string' ? raw.opcaoB : '',
    modoSugerido: modoSugerido as ModoJogoConteudo,
    autorId: typeof raw.autorId === 'string' ? raw.autorId : '',
    autorNome: typeof raw.autorNome === 'string' ? raw.autorNome : t('common.anonymous'),
    status,
    createdAtMs: createdAt?.toMillis?.() ?? 0,
    updatedAtMs: updatedAt?.toMillis?.() ?? 0,
    reviewedAtMs: reviewedAt?.toMillis?.() ?? null,
  };
}

export async function buscarPerguntasPorModo(modo: ModoJogo): Promise<Pergunta[]> {
  try {
    const language = getAppLanguage();

    if (modo === ModoJogo.favoritas) {
      return buscarPerguntasFavoritas(language);
    }

    if (modo === ModoJogo.comunidade) {
      return buscarPerguntasComunidade(language);
    }

    const db = getFirebaseFirestore();
    const questionsRef = collection(db, 'perguntas', modo, 'itens');
    const snapshot = await getDocs(questionsRef);

    return snapshot.docs.map((questionDoc) =>
      mapPerguntaDoc(questionDoc.data() as Record<string, unknown>, language, questionDoc.id, modo)
    );
  } catch (error) {
    if (__DEV__) {
      console.error(`[Firestore] Falha ao buscar perguntas do modo "${modo}".`, error);
    }
    throw new Error(parseFirebaseError(error));
  }
}

async function buscarPerguntasFavoritas(language: ReturnType<typeof getAppLanguage>): Promise<Pergunta[]> {
  const db = getFirebaseFirestore();
  const uid = await getCurrentUid();
  const favoritesRef = collection(db, 'users', uid, 'favoritos');
  const snapshot = await getDocs(query(favoritesRef, orderBy('createdAt', 'desc')));

  const mapped: Array<Pergunta | null> = snapshot.docs.map((favoriteDoc) => {
      const data = favoriteDoc.data() as Record<string, unknown>;
      const modo = data.modo;
      const questionId = typeof data.questionId === 'string' ? data.questionId : favoriteDoc.id;

      if (!modo || typeof modo !== 'string' || !isModoJogoConteudo(modo as ModoJogo)) {
        return null;
      }

      return mapPerguntaDoc(data, language, questionId, modo as ModoJogoConteudo);
    });

  return mapped.filter((item): item is Pergunta => item !== null);
}

async function buscarPerguntasComunidade(language: ReturnType<typeof getAppLanguage>): Promise<Pergunta[]> {
  const db = getFirebaseFirestore();
  const communityRef = collection(db, 'comunidade_favoritas');
  const snapshot = await getDocs(query(communityRef, orderBy('favoriteCount', 'desc'), limit(80)));

  const mapped: Array<Pergunta | null> = snapshot.docs.map((questionDoc) => {
      const data = questionDoc.data() as Record<string, unknown>;
      const favoriteCount = typeof data.favoriteCount === 'number' ? data.favoriteCount : 0;
      const modeFromDoc = data.modo;
      const questionId = typeof data.questionId === 'string' ? data.questionId : questionDoc.id;

      if (!modeFromDoc || typeof modeFromDoc !== 'string' || !isModoJogoConteudo(modeFromDoc as ModoJogo)) {
        return null;
      }

      if (favoriteCount <= 0) {
        return null;
      }

      const mappedQuestion = mapPerguntaDoc(data, language, questionId, modeFromDoc as ModoJogoConteudo);
      if (!mappedQuestion.titulo || !mappedQuestion.opcaoA || !mappedQuestion.opcaoB) {
        return null;
      }

      return mappedQuestion;
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
      throw new Error(t('error.question.invalidModeRemoval'));
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
      throw new Error(t('error.question.favoriteOnlyContent'));
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
      throw new Error(t('error.question.suggestionNotFound'));
    }

    const raw = suggestionSnapshot.data() as Record<string, unknown>;
    const mapped = mapSugestaoDoc(id, raw);
    if (!mapped) {
      throw new Error(t('error.question.suggestionInvalid'));
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
