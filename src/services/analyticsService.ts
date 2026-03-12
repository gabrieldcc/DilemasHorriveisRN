import analytics from '@react-native-firebase/analytics';
import { Pergunta, ModoJogo, OpcaoEscolha } from '../models/game';

// Helper to avoid sending too many unique event names
const sanitizeName = (name: string) => name.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 40);

/**
 * Logs a screen_view event.
 * Firebase automatically tracks screen views on native platforms, but manual
 * tracking gives more control and works for web/hybrid approaches.
 */
export const trackScreenView = async (screenName: string) => {
  try {
    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenName,
    });
  } catch (error) {
    console.warn('[Analytics] Failed to log screen_view', error);
  }
};

/**
 * Sets user properties.
 */
export const setUserProperty = async (name: string, value: string | null) => {
  try {
    await analytics().setUserProperty(sanitizeName(name), value);
  } catch (error) {
    console.warn(`[Analytics] Failed to set user property ${name}`, error);
  }
};

export const setUserId = async (userId: string | null) => {
  try {
    await analytics().setUserId(userId);
  } catch (error) {
    console.warn('[Analytics] Failed to set user ID', error);
  }
};


// --- Event Tracking ---

export const trackSelectMode = async (mode: ModoJogo) => {
  try {
    await analytics().logEvent('select_mode', { mode });
  } catch (error) {
    console.warn('[Analytics] Failed to log select_mode', error);
  }
};

export const trackSelectGameType = async (gameType: 'classic' | 'infiltrado', mode: ModoJogo) => {
  try {
    await analytics().logEvent('select_game_type', { game_type: gameType, mode });
  } catch (error) {
    console.warn('[Analytics] Failed to log select_game_type', error);
  }
};

export const trackQuestionView = async (question: Pergunta, index: number, total: number) => {
  try {
    await analytics().logEvent('question_view', {
      question_id: question.id,
      mode: question.modo,
      question_index: index,
      total_questions: total,
    });
  } catch (error) {
    console.warn('[Analytics] Failed to log question_view', error);
  }
};

export const trackQuestionAnswer = async (
  question: Pergunta,
  answer: OpcaoEscolha,
  responseTimeMs: number
) => {
  try {
    await analytics().logEvent('question_answer', {
      question_id: question.id,
      mode: question.modo,
      answer,
      response_time_ms: Math.round(responseTimeMs),
    });
  } catch (error) {
    console.warn('[Analytics] Failed to log question_answer', error);
  }
};

export const trackQuestionSwipeBack = async (question: Pergunta, index: number) => {
    try {
        await analytics().logEvent('question_swipe_back', {
            question_id: question.id,
            mode: question.modo,
            question_index: index,
        });
    } catch (error) {
        console.warn('[Analytics] Failed to log question_swipe_back', error);
    }
};

export const trackToggleFavorite = async (question: Pergunta, favorited: boolean) => {
  try {
    await analytics().logEvent('toggle_favorite', {
      question_id: question.id,
      mode: question.modo,
      favorited,
    });
  } catch (error) {
    console.warn('[Analytics] Failed to log toggle_favorite', error);
  }
};

export const trackShareQuestion = async (question: Pergunta) => {
  try {
    // expo-sharing doesn't provide the destination, so we log the intent to share.
    await analytics().logEvent('share_question', {
      question_id: question.id,
      mode: question.modo,
    });
  } catch (error) {
    console.warn('[Analytics] Failed to log share_question', error);
  }
};

export const trackSubmitSuggestion = async (modeSuggested: ModoJogo) => {
  try {
    await analytics().logEvent('submit_suggestion', {
      mode_suggested: modeSuggested,
    });
  } catch (error) {
    console.warn('[Analytics] Failed to log submit_suggestion', error);
  }
};

export const trackOpenComments = async (question: Pergunta) => {
  try {
    await analytics().logEvent('open_comments', {
      question_id: question.id,
      mode: question.modo,
    });
  } catch (error) {
    console.warn('[Analytics] Failed to log open_comments', error);
  }
};

export const trackPostComment = async (question: Pergunta, commentLength: number) => {
  try {
    await analytics().logEvent('post_comment', {
      question_id: question.id,
      mode: question.modo,
      comment_length: commentLength,
    });
  } catch (error) {
    console.warn('[Analytics] Failed to log post_comment', error);
  }
};

export const trackGameOver = async (mode: ModoJogo, questionsAnswered: number) => {
    try {
        await analytics().logEvent('game_over', {
            mode,
            questions_answered: questionsAnswered,
        });
    } catch (error) {
        console.warn('[Analytics] Failed to log game_over', error);
    }
};

export const trackAdImpression = async (adFormat: string, adUnitId: string) => {
    try {
        await analytics().logEvent('ad_impression', {
            ad_platform: 'admob',
            ad_source: 'google_mobile_ads',
            ad_format: adFormat,
            ad_unit_name: adUnitId,
        });
    } catch (error) {
        console.warn('[Analytics] Failed to log ad_impression', error);
    }
};

export const trackAdClick = async (adFormat: string, adUnitId: string) => {
    try {
        await analytics().logEvent('ad_click', {
            ad_platform: 'admob',
            ad_source: 'google_mobile_ads',
            ad_format: adFormat,
            ad_unit_name: adUnitId,
        });
    } catch (error) {
        console.warn('[Analytics] Failed to log ad_click', error);
    }
};

export const trackSetName = async () => {
    try {
        await analytics().logEvent('set_name');
    } catch (error) {
        console.warn('[Analytics] Failed to log set_name', error);
    }
};