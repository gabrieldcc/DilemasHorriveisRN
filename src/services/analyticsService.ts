type EventPayload = Record<string, any> | undefined;

let analyticsInstance: any = null;
let analyticsLoaded = false;

function getAnalytics() {
  if (analyticsLoaded) {
    return analyticsInstance;
  }

  analyticsLoaded = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const analyticsModule = require('@react-native-firebase/analytics').default;
    analyticsInstance = analyticsModule ? analyticsModule() : null;
  } catch (error) {
    analyticsInstance = null;
    if (__DEV__) {
      console.warn('[Analytics] Módulo não encontrado, eventos serão ignorados.', error);
    }
  }

  return analyticsInstance;
}

async function logEvent(name: string, payload?: EventPayload) {
  const instance = getAnalytics();
  if (!instance) {
    return;
  }

  try {
    await instance.logEvent(name, payload);
  } catch (error) {
    if (__DEV__) {
      console.warn(`[Analytics] Falha ao registrar evento "${name}".`, error);
    }
  }
}

export const AnalyticsService = {
  trackAppOpen: () => logEvent('app_open'),
  trackSessionStart: () => logEvent('session_started'),
  trackQuestionViewed: (params: { question_id: string; mode: string }) =>
    logEvent('question_viewed', params),
  trackQuestionAnswered: (params: {
    question_id: string;
    mode: string;
    answer_selected: string;
    response_time_ms: number;
  }) => logEvent('question_answered', params),
  trackNextQuestion: (params: { mode: string; session_questions_answered: number }) =>
    logEvent('next_question', params),
  trackSessionQuestions: (params: { session_questions_answered: number }) =>
    logEvent('session_questions_answered', params),
  trackInterstitialShown: (params?: EventPayload) => logEvent('interstitial_shown', params),
  trackInterstitialFailed: (params?: EventPayload) => logEvent('interstitial_failed', params),
  trackInterstitialClicked: (params?: EventPayload) => logEvent('interstitial_clicked', params),
  trackShare: (params: { question_id: string; destination?: string }) => logEvent('share_question', params),
  trackShareTap: (params: EventPayload) => logEvent('share_question_tap', params),
  trackPremiumPurchaseStarted: () => logEvent('premium_purchase_started'),
  trackPremiumPurchaseCompleted: () => logEvent('premium_purchase_completed'),
};

export const trackScreenView = async (screenName: string) =>
  logEvent('screen_view', {
    screen_name: screenName,
    screen_class: screenName,
  });

export const trackSelectMode = async (mode: string) =>
  logEvent('select_mode', {
    mode,
  });

export const trackSelectGameType = async (gameType: 'classic' | 'infiltrado', mode: string) =>
  logEvent('select_game_type', {
    game_type: gameType,
    mode,
  });

export const trackQuestionView = async (
  question: { id: string; modo: string },
  index: number,
  total: number
) =>
  logEvent('question_view', {
    question_id: question.id,
    mode: question.modo,
    question_index: index,
    total_questions: total,
  });

export const trackQuestionAnswer = async (
  question: { id: string; modo: string },
  answer: string,
  responseTimeMs: number
) =>
  logEvent('question_answer', {
    question_id: question.id,
    mode: question.modo,
    answer,
    response_time_ms: Math.round(responseTimeMs),
  });

export const trackQuestionSwipeBack = async (question: { id: string; modo: string }, index: number) =>
  logEvent('question_swipe_back', {
    question_id: question.id,
    mode: question.modo,
    question_index: index,
  });

export const trackToggleFavorite = async (question: { id: string; modo: string }, favorited: boolean) =>
  logEvent('toggle_favorite', {
    question_id: question.id,
    mode: question.modo,
    favorited,
  });

export const trackShareQuestion = async (question: { id: string; modo: string }) =>
  logEvent('share_question', {
    question_id: question.id,
    mode: question.modo,
  });

export const trackSubmitSuggestion = async (modeSuggested: string) =>
  logEvent('submit_suggestion', {
    mode_suggested: modeSuggested,
  });

export const trackOpenComments = async (question: { id: string; modo: string }) =>
  logEvent('open_comments', {
    question_id: question.id,
    mode: question.modo,
  });

export const trackPostComment = async (question: { id: string; modo: string }, commentLength: number) =>
  logEvent('post_comment', {
    question_id: question.id,
    mode: question.modo,
    comment_length: commentLength,
  });

export const trackGameOver = async (mode: string, questionsAnswered: number) =>
  logEvent('game_over', {
    mode,
    questions_answered: questionsAnswered,
  });

export const trackAdImpression = async (adFormat: string, adUnitId: string) =>
  logEvent('ad_impression', {
    ad_platform: 'admob',
    ad_source: 'google_mobile_ads',
    ad_format: adFormat,
    ad_unit_name: adUnitId,
  });

export const trackAdClick = async (adFormat: string, adUnitId: string) =>
  logEvent('ad_click', {
    ad_platform: 'admob',
    ad_source: 'google_mobile_ads',
    ad_format: adFormat,
    ad_unit_name: adUnitId,
  });

export const trackSetName = async () => logEvent('set_name');
