import { useCallback } from 'react';

import { AnalyticsService } from '../services/analyticsService';

export function useAnalytics() {
  const trackQuestionViewed = useCallback(
    (params: { question_id: string; mode: string }) => AnalyticsService.trackQuestionViewed(params),
    []
  );

  const trackQuestionAnswered = useCallback(
    (params: { question_id: string; mode: string; answer_selected: string; response_time_ms: number }) =>
      AnalyticsService.trackQuestionAnswered(params),
    []
  );

  const trackNextQuestion = useCallback(
    (params: { mode: string; session_questions_answered: number }) => AnalyticsService.trackNextQuestion(params),
    []
  );

  const trackShare = useCallback(
    (params: { question_id: string; destination?: string }) => AnalyticsService.trackShare(params),
    []
  );

  return {
    trackQuestionViewed,
    trackQuestionAnswered,
    trackNextQuestion,
    trackShare,
  };
}
