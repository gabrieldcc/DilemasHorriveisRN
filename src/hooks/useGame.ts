import { useCallback, useEffect, useRef } from 'react';

import { ModoJogo, OpcaoEscolha } from '../models/game';
import { useGameStore } from '../store/gameStore';

const NEXT_QUESTION_DELAY_MS = 280;

export function useGame(modo: ModoJogo) {
  const {
    questions,
    currentIndex,
    selectedOption,
    isLoading,
    error,
    loadQuestions,
    nextQuestion,
    setSelectedOption,
  } = useGameStore();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadQuestions(modo);
  }, [modo, loadQuestions]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const selectOption = useCallback(
    (option: OpcaoEscolha) => {
      if (selectedOption !== null) {
        return;
      }

      setSelectedOption(option);

      timeoutRef.current = setTimeout(() => {
        nextQuestion();
      }, NEXT_QUESTION_DELAY_MS);
    },
    [nextQuestion, selectedOption, setSelectedOption]
  );

  return {
    currentQuestion: questions[currentIndex] ?? null,
    currentIndex,
    total: questions.length,
    isLoading,
    error,
    selectedOption,
    nextQuestion,
    selectOption,
    reload: () => loadQuestions(modo),
  };
}
