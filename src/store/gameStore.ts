import { create } from 'zustand';

import { ModoJogo, OpcaoEscolha, Pergunta } from '../models/game';
import { buscarPerguntasPorModo } from '../services/questionsService';
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
    set({ isLoading: true, error: null, mode: modo, selectedOption: null, currentIndex: 0 });

    try {
      const perguntas = await buscarPerguntasPorModo(modo);
      const shuffled = shuffleArray(perguntas);
      set({ questions: shuffled, isLoading: false, currentIndex: 0 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar perguntas.';
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
  setSelectedOption: (option) => {
    set({ selectedOption: option });
  },
  reset: () => {
    set({ currentIndex: 0, selectedOption: null, questions: [], isLoading: false, error: null, mode: null });
  },
}));
