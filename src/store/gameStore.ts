import { create } from 'zustand';

import { BUILTIN_MODE_IDS, ModoJogo, OpcaoEscolha, Pergunta } from '../models/game';
import { i18n } from '../i18n';
import { buscarPerguntasPorModo } from '../services/questionsService';
import { getQuestionsPerSession, isModoJogoConteudo } from '../utils/gameModes';
import { shuffleArray } from '../utils/shuffle';

interface GameState {
  mode: ModoJogo | null;
  questions: Pergunta[];
  currentIndex: number;
  selectedOption: OpcaoEscolha | null;
  isLoading: boolean;
  error: string | null;
  sessions: Partial<Record<ModoJogo, { questions: Pergunta[]; currentIndex: number }>>;
  loadQuestions: (modo: ModoJogo, options?: { force?: boolean }) => Promise<void>;
  nextQuestion: () => void;
  previousQuestion: () => void;
  setSelectedOption: (option: OpcaoEscolha | null) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  mode: null,
  questions: [],
  currentIndex: 0,
  selectedOption: null,
  isLoading: false,
  error: null,
  sessions: {},
  loadQuestions: async (modo, options) => {
    const { sessions } = get();
    const cachedSession = sessions[modo];
    const shouldForceReload = options?.force ?? false;

    if (!shouldForceReload && cachedSession) {
      const restoredIndex = Math.min(cachedSession.currentIndex, Math.max(cachedSession.questions.length - 1, 0));
      set({
        mode: modo,
        questions: cachedSession.questions,
        currentIndex: restoredIndex,
        selectedOption: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    set({
      isLoading: true,
      error: null,
      mode: modo,
      selectedOption: null,
      currentIndex: 0,
      questions: [],
    });

    try {
      const perguntas = await buscarPerguntasPorModo(modo);
      const shouldShuffle = isModoJogoConteudo(modo);
      const preparedQuestions = shouldShuffle ? shuffleArray(perguntas) : perguntas;
      const limitedQuestions = preparedQuestions.slice(0, getQuestionsPerSession(modo));
      set((state) => ({
        questions: limitedQuestions,
        isLoading: false,
        currentIndex: 0,
        sessions: {
          ...state.sessions,
          [modo]: {
            questions: limitedQuestions,
            currentIndex: 0,
          },
        },
      }));
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : i18n.t('errors.loadQuestions');
      const message =
        modo === BUILTIN_MODE_IDS.comunidade && rawMessage.toLowerCase().includes('firebase')
          ? i18n.t('errors.communityUnavailable')
          : rawMessage;
      console.error(`[GameStore] Erro ao carregar perguntas do modo "${modo}":`, error);
      set({ error: message, isLoading: false, questions: [], currentIndex: 0 });
    }
  },
  nextQuestion: () => {
    const { currentIndex, questions, mode } = get();
    const nextIndex = currentIndex + 1;

    if (nextIndex >= questions.length) {
      set({ currentIndex: questions.length, selectedOption: null });
      return;
    }

    set((state) => ({
      currentIndex: nextIndex,
      selectedOption: null,
      sessions:
        mode === null
          ? state.sessions
          : {
              ...state.sessions,
              [mode]: {
                questions: state.questions,
                currentIndex: nextIndex,
              },
            },
    }));
  },
  previousQuestion: () => {
    const { currentIndex, questions, mode } = get();

    if (questions.length === 0) {
      return;
    }

    if (currentIndex >= questions.length) {
      const lastIndex = questions.length - 1;
      set((state) => ({
        currentIndex: lastIndex,
        selectedOption: null,
        sessions:
          mode === null
            ? state.sessions
            : {
                ...state.sessions,
                [mode]: {
                  questions: state.questions,
                  currentIndex: lastIndex,
                },
              },
      }));
      return;
    }

    if (currentIndex <= 0) {
      return;
    }

    const previousIndex = currentIndex - 1;
    set((state) => ({
      currentIndex: previousIndex,
      selectedOption: null,
      sessions:
        mode === null
          ? state.sessions
          : {
              ...state.sessions,
              [mode]: {
                questions: state.questions,
                currentIndex: previousIndex,
              },
            },
    }));
  },
  setSelectedOption: (option) => {
    set({ selectedOption: option });
  },
  reset: () => {
    set({
      currentIndex: 0,
      selectedOption: null,
      questions: [],
      isLoading: false,
      error: null,
      mode: null,
      sessions: {},
    });
  },
}));
