import { useCallback, useEffect, useState } from 'react';

import { ModoJogo, OpcaoEscolha } from '../models/game';
import { alternarPerguntaFavorita, carregarFavoritosDoUsuario } from '../services/questionsService';
import { useGameStore } from '../store/gameStore';

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
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadQuestions(modo);
  }, [modo, loadQuestions]);

  const currentQuestion = questions[currentIndex] ?? null;

  useEffect(() => {
    let isMounted = true;

    const loadFavorites = async () => {
      try {
        const loaded = await carregarFavoritosDoUsuario();
        if (isMounted) {
          setFavoriteIds(loaded);
        }
      } catch {
        if (isMounted) {
          setFavoriteIds(new Set());
        }
      }
    };

    void loadFavorites();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!currentQuestion) {
      setIsFavorite(false);
      return;
    }

    setIsFavorite(favoriteIds.has(`${currentQuestion.modo}__${currentQuestion.id}`));
  }, [currentQuestion, favoriteIds]);

  const selectOption = useCallback(
    (option: OpcaoEscolha) => {
      if (selectedOption !== null) {
        return;
      }

      setSelectedOption(option);
    },
    [selectedOption, setSelectedOption]
  );

  const toggleFavorite = useCallback(async (): Promise<boolean | null> => {
    if (!currentQuestion || isFavoriteLoading) {
      return null;
    }

    const previousValue = isFavorite;
    const optimisticValue = !previousValue;
    setIsFavorite(optimisticValue);
    setIsFavoriteLoading(true);
    try {
      const nextValue = await alternarPerguntaFavorita(currentQuestion);
      setIsFavorite(nextValue);
      setFavoriteIds((current) => {
        const next = new Set(current);
        const favoriteId = `${currentQuestion.modo}__${currentQuestion.id}`;
        if (nextValue) {
          next.add(favoriteId);
        } else {
          next.delete(favoriteId);
        }
        return next;
      });

      if (modo === ModoJogo.favoritas && !nextValue) {
        await loadQuestions(modo, { force: true });
      }

      return nextValue;
    } catch (error) {
      setIsFavorite(previousValue);
      if (__DEV__) {
        console.error('[useGame] Falha ao alternar favorito:', error);
      }
      return null;
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
    reload: () => loadQuestions(modo, { force: true }),
  };
}
