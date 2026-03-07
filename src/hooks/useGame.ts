import { useCallback, useEffect, useRef, useState } from 'react';

import { ModoJogo, OpcaoEscolha } from '../models/game';
import { alternarPerguntaFavorita, isPerguntaFavorita } from '../services/questionsService';
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
    previousQuestion,
    setSelectedOption,
  } = useGameStore();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);

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

  const currentQuestion = questions[currentIndex] ?? null;

  useEffect(() => {
    let isMounted = true;

    const loadFavoriteStatus = async () => {
      if (!currentQuestion) {
        if (isMounted) {
          setIsFavorite(false);
        }
        return;
      }

      try {
        const favoriteStatus = await isPerguntaFavorita(currentQuestion);
        if (isMounted) {
          setIsFavorite(favoriteStatus);
        }
      } catch {
        if (isMounted) {
          setIsFavorite(false);
        }
      }
    };

    void loadFavoriteStatus();

    return () => {
      isMounted = false;
    };
  }, [currentQuestion]);

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

  const toggleFavorite = useCallback(async () => {
    if (!currentQuestion || isFavoriteLoading) {
      return;
    }

    const previousValue = isFavorite;
    const optimisticValue = !previousValue;
    setIsFavorite(optimisticValue);
    setIsFavoriteLoading(true);
    try {
      const nextValue = await alternarPerguntaFavorita(currentQuestion);
      setIsFavorite(nextValue);

      if (modo === ModoJogo.favoritas && !nextValue) {
        await loadQuestions(modo);
      }
    } catch (error) {
      setIsFavorite(previousValue);
      if (__DEV__) {
        console.error('[useGame] Falha ao alternar favorito:', error);
      }
    } finally {
      setIsFavoriteLoading(false);
    }
  }, [currentQuestion, isFavorite, isFavoriteLoading, loadQuestions, modo]);

  return {
    currentQuestion,
    currentIndex,
    total: questions.length,
    isLoading,
    error,
    selectedOption,
    nextQuestion,
    previousQuestion,
    selectOption,
    isFavorite,
    isFavoriteLoading,
    toggleFavorite,
    reload: () => loadQuestions(modo),
  };
}
