import { create } from 'zustand';

import { ModoJogo, OpcaoEscolha, Pergunta } from '../models/game';
import { buscarPerguntasPorModo } from '../services/questionsService';
import { isModoJogoConteudo } from '../utils/gameModes';
import { shuffleArray } from '../utils/shuffle';

interface GameState {
  mode: ModoJogo | null;
  questions: Pergunta[];
  currentIndex: number;
  selectedOption: OpcaoEscolha | null;
  isLoading: boolean;
  error: string | null;
  loadQuestions: (modo: ModoJogo) => Promise<void>;
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
  loadQuestions: async (modo) => {
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
      set({ questions: preparedQuestions, isLoading: false, currentIndex: 0 });
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : 'Falha ao carregar perguntas.';
      const message =
        modo === ModoJogo.comunidade && rawMessage.toLowerCase().includes('firebase')
          ? 'Modo Comunidade indisponivel no momento. Ajuste o indice do Firestore e tente novamente.'
          : rawMessage;
      console.error(`[GameStore] Erro ao carregar perguntas do modo "${modo}":`, error);
      set({ error: message, isLoading: false, questions: [], currentIndex: 0 });
    }
  },
  nextQuestion: () => {
    const { currentIndex, questions } = get();
    const nextIndex = currentIndex + 1;

    if (nextIndex >= questions.length) {
      set({ currentIndex: questions.length, selectedOption: null });
      return;
    }

    set({ currentIndex: nextIndex, selectedOption: null });
  },
  previousQuestion: () => {
    const { currentIndex, questions } = get();

    if (questions.length === 0) {
      return;
    }

    if (currentIndex >= questions.length) {
      set({ currentIndex: questions.length - 1, selectedOption: null });
      return;
    }

    if (currentIndex <= 0) {
      return;
    }

    set({ currentIndex: currentIndex - 1, selectedOption: null });
  },
  setSelectedOption: (option) => {
    set({ selectedOption: option });
  },
  reset: () => {
    set({ currentIndex: 0, selectedOption: null, questions: [], isLoading: false, error: null, mode: null });
  },
}));
