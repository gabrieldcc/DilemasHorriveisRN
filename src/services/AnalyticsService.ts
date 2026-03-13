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
