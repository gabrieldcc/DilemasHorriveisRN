import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BlurView } from 'expo-blur';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Directions, Gesture, GestureDetector, ScrollView as GestureHandlerScrollView } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut, SlideInLeft, runOnJS, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import { AdBanner } from '../components/ads/AdBanner';
import { OptionButton } from '../components/OptionButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { ModoJogo } from '../models/game';
import { useAnalytics } from '../hooks/useAnalytics';
import { useInterstitialAds } from '../hooks/useInterstitialAds';
import {
  adicionarComentarioPergunta,
  alternarLikeComentario,
  buscarComentariosPergunta,
  ComentarioPergunta,
  removerComentarioPergunta,
} from '../services/commentsService';
import { useGame } from '../hooks/useGame';
import { getModoLabel, isModoJogo } from '../utils/gameModes';
import {
  trackGameOver,
  trackOpenComments,
  trackPostComment,
  trackQuestionAnswer,
  trackQuestionSwipeBack,
  trackQuestionView,
  trackScreenView,
  trackShareQuestion,
  trackToggleFavorite,
} from '../services/analyticsService';
import { useFeatureFlagsStore } from '../store/featureFlagsStore';
import { areAdsEnabled, isFirstSessionAdsEnabled } from '../services/RemoteConfigService';
import { getQuestionCount } from '../utils/sessionManager';
import { t } from '../i18n';

function buildResultPercentages(questionId: string, selected: 'A' | 'B') {
  let hash = 0;
  for (let i = 0; i < questionId.length; i += 1) {
    hash = (hash * 31 + questionId.charCodeAt(i)) % 1000;
  }

  const base = 36 + (hash % 18); // 36-53
  const swing = 20 + ((hash >> 2) % 12); // 20-31

  const favorSelected = base + swing; // 56-84
  const optionAPercentage = selected === 'A' ? favorSelected : 100 - favorSelected;
  const clampedA = Math.min(Math.max(Math.round(optionAPercentage), 8), 92);

  return {
    A: clampedA,
    B: 100 - clampedA,
  };
}

export function GameScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ mode?: string; favoriteHint?: string; gameType?: string }>();
  const [showFavoriteHint, setShowFavoriteHint] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isShareOverlayVisible, setIsShareOverlayVisible] = useState(false);
  const [transitionType, setTransitionType] = useState<'default' | 'back'>('default');
  const [shouldShowLoadingOverlay, setShouldShowLoadingOverlay] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [comments, setComments] = useState<ComentarioPergunta[]>([]);
  const [commentsCount, setCommentsCount] = useState(0);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [likingCommentIds, setLikingCommentIds] = useState<Record<string, boolean>>({});
  const likingInFlightRef = useRef<Record<string, boolean>>({});
  const questionViewTimeRef = useRef(0);
  const shareGhostTapUntilRef = useRef(0);
  const commentsEnabled = useFeatureFlagsStore((state) => state.flags.commentsEnabled);
  const gameType = params.gameType === 'infiltrado' ? 'infiltrado' : 'classic';
  const isInfiltradoMatch = gameType === 'infiltrado';
  const [infiltradoPhase, setInfiltradoPhase] = useState<'setup' | 'reveal' | 'ready' | null>(
    isInfiltradoMatch ? 'setup' : null
  );
  const [playerCountInput, setPlayerCountInput] = useState('4');
  const [playerCount, setPlayerCount] = useState(0);
  const [infiltradoIndex, setInfiltradoIndex] = useState<number | null>(null);
  const [revealIndex, setRevealIndex] = useState(0);
  const [isRoleVisible, setIsRoleVisible] = useState(false);
  const { trackQuestionViewed, trackQuestionAnswered, trackNextQuestion, trackShare } = useAnalytics();
  const { registerAnswerAndMaybeShowAd, ensurePreload, isFirstSession } = useInterstitialAds();
  const [resultPercents, setResultPercents] = useState<{ A: number; B: number } | null>(null);
  const questionStartRef = useRef<number>(Date.now());
  const allowAdsThisSession = areAdsEnabled() && (!isFirstSession || isFirstSessionAdsEnabled());

  useEffect(() => {
    if (params.favoriteHint === '1') {
      setShowFavoriteHint(true);
    }
  }, [params.favoriteHint]);

  useEffect(() => {
    if (isInfiltradoMatch) {
      setInfiltradoPhase('setup');
      return;
    }
    setInfiltradoPhase(null);
  }, [isInfiltradoMatch]);

  useEffect(() => {
    if (!commentsEnabled && showCommentsModal) {
      setShowCommentsModal(false);
    }
  }, [commentsEnabled, showCommentsModal]);

  if (!params.mode || !isModoJogo(params.mode)) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{t('game.invalidMode')}</Text>
          <Pressable style={styles.secondaryButton} onPress={() => router.replace('/')}>
            <Text style={styles.secondaryButtonText}>{t('common.back')}</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const modo = params.mode as ModoJogo;
  const {
    currentQuestion,
    currentIndex,
    total,
    isLoading,
    error,
    selectedOption,
    nextQuestion,
    selectOption,
    previousQuestion,
    isFavorite,
    isFavoriteLoading,
    toggleFavorite,
    reload,
  } = useGame(modo);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: getModoLabel(modo),
      headerRight: () => (
        <Text style={styles.navHeaderProgress}>
          {total > 0 ? `${Math.min(currentIndex + 1, total)}/${total}` : ''}
        </Text>
      ),
    });
  }, [navigation, currentIndex, total, modo]);

  useEffect(() => {
    setCommentsCount(0);
  }, [currentQuestion?.id, currentQuestion?.modo]);

  useEffect(() => {
    void trackScreenView('GameScreen');
  }, []);

  useEffect(() => {
    if (!currentQuestion) {
      return;
    }
    questionViewTimeRef.current = Date.now();
    void trackQuestionView(currentQuestion, currentIndex, total);
    questionStartRef.current = Date.now();
    setResultPercents(null);
    trackQuestionViewed({ question_id: currentQuestion.id, mode: modo });
    ensurePreload();
  }, [currentQuestion, currentQuestion?.id, currentIndex, total, modo, trackQuestionViewed, ensurePreload]);

  useEffect(() => {
    if (!isLoading) {
      setShouldShowLoadingOverlay(false);
      return;
    }

    const timeout = setTimeout(() => {
      setShouldShowLoadingOverlay(true);
    }, 300);

    return () => clearTimeout(timeout);
  }, [isLoading]);
  const favoriteScale = useSharedValue(1);
  const shareTemplateRef = useRef<View | null>(null);
  const favoriteIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: favoriteScale.value }],
  }));

  const isShareGhostTapActive = () => Date.now() < shareGhostTapUntilRef.current;

  const handleSwipeBack = () => {
    if (isShareOverlayVisible || isShareGhostTapActive()) {
      return;
    }
    if (selectedOption !== null) {
      return;
    }
    if (currentQuestion) {
      void trackQuestionSwipeBack(currentQuestion, currentIndex);
    }
    setTransitionType('back');
    previousQuestion();
  };

  const swipeGesture = Gesture.Fling()
    .direction(Directions.RIGHT)
    .numberOfPointers(1)
    .onEnd(() => {
      runOnJS(handleSwipeBack)();
    });

  const handleFavoritePress = () => {
    if (isShareOverlayVisible || isShareGhostTapActive()) {
      return;
    }
    favoriteScale.value = withSequence(withTiming(1.2, { duration: 110 }), withTiming(1, { duration: 110 }));
    void toggleFavorite().then((isNowFavorite) => {
      if (currentQuestion && typeof isNowFavorite === 'boolean') {
        void trackToggleFavorite(currentQuestion, isNowFavorite);
      }
    });
  };

  const handleSelectOptionA = () => {
    if (isShareOverlayVisible || isShareGhostTapActive() || !currentQuestion) {
      return;
    }
    // Primeiro toque seleciona; segundo toque avança.
    if (selectedOption === null) {
      setTransitionType('default');
      const responseTime = Math.max(0, Date.now() - questionStartRef.current);
      void trackQuestionAnswer(currentQuestion, 'A', responseTime);
      setResultPercents(buildResultPercentages(currentQuestion.id, 'A'));
      trackQuestionAnswered({
        question_id: currentQuestion.id,
        mode: modo,
        answer_selected: 'A',
        response_time_ms: responseTime,
      });
      selectOption('A');
      return;
    }
    void handleContinueAfterResult();
  };

  const handleSelectOptionB = () => {
    if (isShareOverlayVisible || isShareGhostTapActive() || !currentQuestion) {
      return;
    }
    if (selectedOption === null) {
      setTransitionType('default');
      const responseTime = Math.max(0, Date.now() - questionStartRef.current);
      void trackQuestionAnswer(currentQuestion, 'B', responseTime);
      setResultPercents(buildResultPercentages(currentQuestion.id, 'B'));
      trackQuestionAnswered({
        question_id: currentQuestion.id,
        mode: modo,
        answer_selected: 'B',
        response_time_ms: responseTime,
      });
      selectOption('B');
      return;
    }
    void handleContinueAfterResult();
  };

  const handleContinueAfterResult = async () => {
    if (selectedOption === null) {
      return;
    }
    await registerAnswerAndMaybeShowAd();
    trackNextQuestion({ mode: modo, session_questions_answered: getQuestionCount() });
    nextQuestion();
  };

  const handleShareQuestion = async () => {
    if (!currentQuestion || !shareTemplateRef.current || isSharing || isShareOverlayVisible || isShareGhostTapActive()) {
      return;
    }
    void trackShareQuestion(currentQuestion);

    setIsShareOverlayVisible(true);
    setIsSharing(true);
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert(t('game.shareUnavailableTitle'), t('game.shareUnavailableBody'));
        return;
      }

      const imageUri = await captureRef(shareTemplateRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        backgroundColor: 'transparent',
      } as any);

      await Sharing.shareAsync(imageUri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: t('game.shareDialogTitle'),
      });
      trackShare({ question_id: currentQuestion.id });
    } catch (error) {
      Alert.alert(t('game.shareErrorTitle'), t('game.shareErrorBody'));
      if (__DEV__) {
        console.error('[Share] Falha ao compartilhar pergunta:', error);
      }
    } finally {
      setIsSharing(false);
      // Absorb residual close-tap from native share sheet without extra user action.
      shareGhostTapUntilRef.current = Date.now() + 180;
      setIsShareOverlayVisible(false);
    }
  };

  const loadComments = async () => {
    if (!currentQuestion) {
      return;
    }
    setIsCommentsLoading(true);
    try {
      const loaded = await buscarComentariosPergunta(currentQuestion);
      setComments(loaded);
      setCommentsCount(loaded.length);
    } catch (error) {
      Alert.alert(t('game.commentsLoadErrorTitle'), error instanceof Error ? error.message : t('game.tryAgain'));
    } finally {
      setIsCommentsLoading(false);
    }
  };

  const handleOpenComments = () => {
    if (!commentsEnabled) {
      return;
    }
    if (currentQuestion) {
      void trackOpenComments(currentQuestion);
    }
    setShowCommentsModal(true);
    void loadComments();
  };

  const handleSubmitComment = async () => {
    if (!currentQuestion || isSendingComment) {
      return;
    }

    const normalized = commentInput.trim();
    if (normalized.length < 3) {
      Alert.alert(t('game.shortCommentTitle'), t('game.shortCommentBody'));
      return;
    }

    setIsSendingComment(true);
    try {
      await adicionarComentarioPergunta(currentQuestion, normalized);
      void trackPostComment(currentQuestion, normalized.length);
      setCommentInput('');
      await loadComments();
    } catch (error) {
      Alert.alert(t('game.commentErrorTitle'), error instanceof Error ? error.message : t('game.commentErrorBody'));
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleToggleLikeComment = (commentId: string) => {
    if (!currentQuestion || likingInFlightRef.current[commentId]) {
      return;
    }
    likingInFlightRef.current[commentId] = true;

    const previousComments = comments;
    const optimisticComments = previousComments.map((comment) => {
      if (comment.id !== commentId) {
        return comment;
      }

      const willBeLiked = !comment.likedByCurrentUser;
      return {
        ...comment,
        likedByCurrentUser: willBeLiked,
        likeCount: Math.max(0, comment.likeCount + (willBeLiked ? 1 : -1)),
      };
    });

    setComments(optimisticComments);
    setLikingCommentIds((prev) => ({ ...prev, [commentId]: true }));

    void alternarLikeComentario(currentQuestion, commentId)
      .then((likedAfterToggle) => {
        setComments((current) =>
          current.map((comment) => {
            if (comment.id !== commentId) {
              return comment;
            }

            if (comment.likedByCurrentUser === likedAfterToggle) {
              return comment;
            }

            return {
              ...comment,
              likedByCurrentUser: likedAfterToggle,
              likeCount: Math.max(0, comment.likeCount + (likedAfterToggle ? 1 : -1)),
            };
          })
        );
      })
      .catch((error) => {
        setComments(previousComments);
        Alert.alert(t('game.likeErrorTitle'), error instanceof Error ? error.message : t('game.likeErrorBody'));
      })
      .finally(() => {
        delete likingInFlightRef.current[commentId];
        setLikingCommentIds((prev) => {
          const next = { ...prev };
          delete next[commentId];
          return next;
        });
      });
  };

  const handleDeleteComment = (commentId: string) => {
    if (!currentQuestion) {
      return;
    }

    Alert.alert(t('game.deleteCommentTitle'), t('game.deleteCommentBody'), [
      { text: t('modeSelection.cancel'), style: 'cancel' },
      {
        text: t('game.delete'),
        style: 'destructive',
        onPress: () => {
          const previousComments = comments;
          setComments((current) => current.filter((comment) => comment.id !== commentId));
          setCommentsCount((value) => Math.max(0, value - 1));

          void removerComentarioPergunta(currentQuestion, commentId).catch((error) => {
            setComments(previousComments);
            setCommentsCount(previousComments.length);
            Alert.alert(t('game.deleteCommentErrorTitle'), error instanceof Error ? error.message : t('game.deleteCommentErrorBody'));
          });
        },
      },
    ]);
  };

  const handleStartInfiltradoSetup = () => {
    const parsed = Number.parseInt(playerCountInput, 10);
    if (Number.isNaN(parsed) || parsed < 3 || parsed > 20) {
      Alert.alert(t('game.invalidPlayerCountTitle'), t('game.invalidPlayerCountBody'));
      return;
    }

    setPlayerCount(parsed);
    setInfiltradoIndex(Math.floor(Math.random() * parsed));
    setRevealIndex(0);
    setIsRoleVisible(false);
    setInfiltradoPhase('reveal');
  };

  const handleNextRevealPlayer = () => {
    if (revealIndex + 1 >= playerCount) {
      setInfiltradoPhase('ready');
      setIsRoleVisible(false);
      return;
    }

    setRevealIndex((current) => current + 1);
    setIsRoleVisible(false);
  };

  const isFinished = !isLoading && !error && total > 0 && currentQuestion === null;

  useEffect(() => {
    if (isFinished) {
      void trackGameOver(modo, total);
    }
  }, [isFinished, modo, total]);

  const shouldBlockGameTouches = showCommentsModal || isShareOverlayVisible;

  return (
    <ScreenContainer>
      <GestureDetector gesture={swipeGesture}>
        <View style={styles.gestureLayer} pointerEvents={shouldBlockGameTouches ? 'none' : 'auto'}>
          <View style={styles.actionsToolbar}>
            <Pressable
              onPress={() =>
                isInfiltradoMatch
                  ? Alert.alert(
                      t('game.switchFormatTitle'),
                      t('game.switchFormatBody'),
                      [
                        { text: t('modeSelection.cancel'), style: 'cancel' },
                        {
                          text: t('game.switchToClassic'),
                          onPress: () =>
                            router.replace({
                              pathname: '/game',
                              params: { mode: modo, gameType: 'classic' },
                            }),
                        },
                      ]
                    )
                  : Alert.alert(
                      t('game.currentFormatTitle'),
                      t('game.currentFormatBody')
                    )
              }
              style={({ pressed }) => [styles.matchTypeChip, pressed && styles.matchTypeChipPressed]}
            >
              <Text style={styles.matchTypeChipText}>{isInfiltradoMatch ? t('game.matchType.infiltrado') : t('game.matchType.classic')}</Text>
            </Pressable>
            <Pressable
              onPress={handleFavoritePress}
              disabled={!currentQuestion || isFavoriteLoading || isShareOverlayVisible}
              style={({ pressed }) => [
                styles.favoriteIconButton,
                isFavorite && styles.favoriteIconButtonActive,
                pressed && styles.favoriteIconButtonPressed,
                (!currentQuestion || isFavoriteLoading || isShareOverlayVisible) && styles.favoriteIconButtonDisabled,
              ]}
            >
              <Animated.View style={favoriteIconAnimatedStyle}>
                {isFavoriteLoading ? (
                  <ActivityIndicator size="small" color="#fde68a" />
                ) : (
                  <Text style={styles.favoriteIconText}>{isFavorite ? '★' : '☆'}</Text>
                )}
              </Animated.View>
            </Pressable>
            <Pressable
              onPress={() => void handleShareQuestion()}
              disabled={!currentQuestion || isSharing || isShareOverlayVisible}
              style={({ pressed }) => [
                styles.shareIconButton,
                pressed && styles.shareIconButtonPressed,
                (!currentQuestion || isSharing || isShareOverlayVisible) && styles.shareIconButtonDisabled,
              ]}
            >
              {isSharing ? (
                <ActivityIndicator size="small" color="#bae6fd" />
              ) : (
                <Text style={styles.shareIconText}>↗</Text>
              )}
            </Pressable>
            {commentsEnabled ? (
              <Pressable
                onPress={handleOpenComments}
                disabled={!currentQuestion}
                style={({ pressed }) => [
                  styles.commentIconButton,
                  pressed && styles.commentIconButtonPressed,
                  !currentQuestion && styles.commentIconButtonDisabled,
                ]}
              >
                <Text style={styles.commentIconText}>💬</Text>
                {commentsCount > 0 ? <Text style={styles.commentCountText}>{commentsCount}</Text> : null}
              </Pressable>
            ) : null}
            <Pressable
              onPress={() =>
                router.push({ pathname: '/tutorial' as never, params: { mode: modo, from: 'game', gameType } })
              }
              style={({ pressed }) => [styles.tutorialIconButton, pressed && styles.tutorialIconButtonPressed]}
            >
              <Text style={styles.tutorialIconText}>?</Text>
            </Pressable>
          </View>
          {allowAdsThisSession ? <AdBanner /> : null}
        {showFavoriteHint ? (
          <View style={styles.favoriteHintOverlay}>
            <View style={styles.favoriteHintBubble}>
              <Text style={styles.favoriteHintTitle}>{t('game.quickTipTitle')}</Text>
              <Text style={styles.favoriteHintText}>{t('game.quickTipBody')}</Text>
              <Pressable onPress={() => setShowFavoriteHint(false)} style={styles.favoriteHintButton}>
                <Text style={styles.favoriteHintButtonText}>{t('game.gotIt')}</Text>
              </Pressable>
            </View>
            <Text style={styles.favoriteHintArrow}>↗</Text>
          </View>
        ) : null}
        {!isLoading && error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.secondaryButton} onPress={reload}>
              <Text style={styles.secondaryButtonText}>{t('game.tryAgain')}</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !error && total === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.helperText}>{t('game.noQuestionsYet')}</Text>
            <Pressable style={styles.secondaryButton} onPress={() => router.replace('/')}>
              <Text style={styles.secondaryButtonText}>{t('game.chooseAnotherMode')}</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !error && isFinished ? (
          <View style={styles.centered}>
            <Text style={styles.doneTitle}>{t('game.endList')}</Text>
            <Text style={styles.helperText}>{t('game.endListBody')}</Text>
            <Pressable style={styles.secondaryButton} onPress={reload}>
              <Text style={styles.secondaryButtonText}>{t('game.playAgain')}</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => router.replace('/')}>
              <Text style={styles.secondaryButtonText}>{t('game.backToModes')}</Text>
            </Pressable>
          </View>
        ) : null}

          {currentQuestion ? (
          <Animated.View
            key={currentQuestion.id}
            entering={transitionType === 'back' ? SlideInLeft.duration(190) : FadeIn.duration(220)}
            exiting={FadeOut.duration(140)}
            style={styles.questionContainer}
          >
            <GestureHandlerScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              <View>
                <View style={styles.arenaPanel}>
                  <Text style={styles.arenaBadge}>{t('game.arenaBadge')}</Text>
                  {/* <Text style={styles.questionTitle}>{currentQuestion.titulo}</Text> */}
                  <View style={styles.arenaDivider}>
                    <View style={styles.arenaDividerLine} />
                    <Text style={styles.arenaDividerText}>A x B</Text>
                    <View style={styles.arenaDividerLine} />
                  </View>
                  <View style={styles.optionsContainer}>
                    <OptionButton
                      label={t('game.optionA')}
                      value={currentQuestion.opcaoA}
                      isSelected={selectedOption === 'A'}
                      showResult={selectedOption !== null}
                      percentage={resultPercents?.A ?? null}
                      isUserChoice={selectedOption === 'A'}
                      onPress={handleSelectOptionA}
                      disabled={isShareOverlayVisible}
                    />
                    <OptionButton
                      label={t('game.optionB')}
                      value={currentQuestion.opcaoB}
                      isSelected={selectedOption === 'B'}
                      showResult={selectedOption !== null}
                      percentage={resultPercents?.B ?? null}
                      isUserChoice={selectedOption === 'B'}
                      onPress={handleSelectOptionB}
                      disabled={isShareOverlayVisible}
                    />
                  </View>
                </View>
              </View>
            </GestureHandlerScrollView>
          </Animated.View>
          ) : null}
          {isLoading && shouldShowLoadingOverlay ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#22d3ee" />
            <Text style={styles.loadingText}>{t('game.loadingQuestions')}</Text>
          </View>
          ) : null}
          {currentQuestion ? (
          <View style={styles.hiddenShareCanvas} pointerEvents="none">
            <View ref={shareTemplateRef} collapsable={false} style={styles.shareExportContainer}>
              <View style={styles.shareExportLogoWrap}>
                <Text style={styles.shareExportLogoTop}>DILEMAS</Text>
                <Text style={styles.shareExportLogoBottom}>Horríveis</Text>
              </View>
              <View style={styles.shareExportCard}>
                <Text style={styles.shareExportQuestion}>{currentQuestion.titulo}</Text>
                <View style={styles.shareExportOption}>
                  <Text style={styles.shareExportOptionLabel}>{t('game.optionA')}</Text>
                  <Text style={styles.shareExportOptionText}>{currentQuestion.opcaoA}</Text>
                </View>
                <View style={styles.shareExportVsWrap}>
                  <Text style={styles.shareExportVsText}>VS</Text>
                </View>
                <View style={styles.shareExportOption}>
                  <Text style={styles.shareExportOptionLabel}>{t('game.optionB')}</Text>
                  <Text style={styles.shareExportOptionText}>{currentQuestion.opcaoB}</Text>
                </View>
              </View>
              <View style={styles.shareExportCtaRow}>
                <Text style={styles.shareExportCtaText}>{t('game.downloadApp')}</Text>
                <View style={styles.shareExportStoresRow}>
                  <Text style={styles.shareExportStoreText}> App Store</Text>
                  <Text style={styles.shareExportStoreText}>▶ Google Play</Text>
                </View>
              </View>
            </View>
          </View>
          ) : null}
        </View>
      </GestureDetector>
      <Modal visible={showCommentsModal} animationType="slide" transparent onRequestClose={() => setShowCommentsModal(false)}>
        <Pressable
          style={styles.commentsBackdrop}
          onPress={() => {
            Keyboard.dismiss();
            setShowCommentsModal(false);
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
            style={styles.commentsKeyboardLayer}
          >
            <Pressable style={styles.commentsCard} onPress={() => {}}>
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle}>{t('game.commentsTitle')}</Text>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  setShowCommentsModal(false);
                }}
                style={styles.commentsCloseButton}
              >
                <Text style={styles.commentsCloseText}>{t('game.close')}</Text>
              </Pressable>
            </View>
            <ScrollView
              style={styles.commentsList}
              contentContainerStyle={styles.commentsListContent}
              keyboardShouldPersistTaps="always"
            >
              {isCommentsLoading ? <ActivityIndicator color="#22d3ee" /> : null}
              {!isCommentsLoading && comments.length === 0 ? (
                <Text style={styles.commentsEmptyText}>{t('game.firstComment')}</Text>
              ) : null}
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentBodyTapArea}>
                    <Text style={styles.commentAuthor}>{comment.autorNome}</Text>
                    <Text style={styles.commentText}>{comment.texto}</Text>
                  </View>
                  <View style={styles.commentFooter}>
                    {comment.canDelete ? (
                      <Pressable
                        onPress={() => handleDeleteComment(comment.id)}
                        style={({ pressed }) => [styles.commentDeleteButton, pressed && styles.commentDeleteButtonPressed]}
                      >
                        <Text style={styles.commentDeleteText}>{t('game.delete')}</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      onPressIn={() => handleToggleLikeComment(comment.id)}
                      disabled={Boolean(likingCommentIds[comment.id])}
                      style={[
                        styles.commentLikeButton,
                        comment.likedByCurrentUser && styles.commentLikeButtonActive,
                      ]}
                    >
                      <Text style={styles.commentLikeIcon}>{comment.likedByCurrentUser ? '❤' : '♡'}</Text>
                      <Text style={styles.commentLikeCount}>{comment.likeCount}</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TextInput
              value={commentInput}
              onChangeText={setCommentInput}
              placeholder={t('game.commentPlaceholder')}
              placeholderTextColor="#64748b"
              multiline
              maxLength={220}
              style={styles.commentInput}
            />
            <Pressable
              onPress={() => void handleSubmitComment()}
              disabled={isSendingComment}
              style={({ pressed }) => [styles.commentSendButton, pressed && styles.commentSendButtonPressed, isSendingComment && styles.commentSendButtonDisabled]}
            >
              <Text style={styles.commentSendButtonText}>{isSendingComment ? t('game.sending') : t('game.sendComment')}</Text>
            </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
      {isShareOverlayVisible ? (
        <Pressable
          style={styles.shareOverlay}
          onPress={() => {}}
        >
          <BlurView intensity={60} tint="dark" style={styles.shareOverlayBlur} />
          <View style={styles.shareOverlayTint} />
        </Pressable>
      ) : null}
      <Modal
        visible={isInfiltradoMatch && infiltradoPhase !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.infiltradoBackdrop}>
          <View style={styles.infiltradoCard}>
            {infiltradoPhase === 'setup' ? (
              <>
                <Text style={styles.infiltradoTitle}>{t('game.setupInfiltradoTitle')}</Text>
                <Text style={styles.infiltradoText}>{t('game.setupInfiltradoBody')}</Text>
                <TextInput
                  value={playerCountInput}
                  onChangeText={setPlayerCountInput}
                  keyboardType="number-pad"
                  placeholder={t('game.playersPlaceholder')}
                  placeholderTextColor="#64748b"
                  style={styles.infiltradoInput}
                />
                <Pressable style={styles.infiltradoPrimaryButton} onPress={handleStartInfiltradoSetup}>
                  <Text style={styles.infiltradoPrimaryButtonText}>{t('game.drawRoles')}</Text>
                </Pressable>
                <Pressable
                  style={styles.infiltradoSecondaryButton}
                  onPress={() =>
                    router.replace({
                      pathname: '/game',
                      params: { mode: modo, gameType: 'classic' },
                    })
                  }
                >
                  <Text style={styles.infiltradoSecondaryButtonText}>{t('game.playClassic')}</Text>
                </Pressable>
              </>
            ) : null}

            {infiltradoPhase === 'reveal' ? (
              <>
                <Text style={styles.infiltradoTitle}>{t('game.passPhone')}</Text>
                <Text style={styles.infiltradoText}>{t('game.playerProgress', { current: revealIndex + 1, total: playerCount })}</Text>
                {!isRoleVisible ? (
                  <Pressable style={styles.infiltradoPrimaryButton} onPress={() => setIsRoleVisible(true)}>
                    <Text style={styles.infiltradoPrimaryButtonText}>{t('game.revealRole')}</Text>
                  </Pressable>
                ) : (
                  <View style={styles.infiltradoRoleBox}>
                    <Text style={styles.infiltradoRoleText}>
                      {revealIndex === infiltradoIndex
                        ? t('game.roleInfiltrado')
                        : t('game.roleLoyal')}
                    </Text>
                    <Pressable style={styles.infiltradoPrimaryButton} onPress={handleNextRevealPlayer}>
                      <Text style={styles.infiltradoPrimaryButtonText}>
                        {revealIndex + 1 >= playerCount ? t('game.finishDistribution') : t('game.nextPlayer')}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </>
            ) : null}

            {infiltradoPhase === 'ready' ? (
              <>
                <Text style={styles.infiltradoTitle}>{t('game.roundReady')}</Text>
                <Text style={styles.infiltradoText}>{t('game.roundReadyBody')}</Text>
                <Pressable style={styles.infiltradoPrimaryButton} onPress={() => setInfiltradoPhase(null)}>
                  <Text style={styles.infiltradoPrimaryButtonText}>{t('game.startRound')}</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  navHeaderProgress: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '500',
  },
  gestureLayer: {
    flex: 1,
    minHeight: 0,
  },
  actionsToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  matchTypeChip: {
    width: 70,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#22d3ee',
    backgroundColor: '#083344',
  },
  matchTypeChipPressed: {
    opacity: 0.86,
  },
  matchTypeChipText: {
    color: '#a5f3fc',
    fontSize: 14,
    fontWeight: '600',
  },
  tutorialIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
  },
  tutorialIconButtonPressed: {
    opacity: 0.85,
  },
  tutorialIconText: {
    color: '#e2e8f0',
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 20,
  },
  favoriteIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
  },
  favoriteIconButtonActive: {
    backgroundColor: '#78350f',
    borderColor: '#f59e0b',
  },
  favoriteIconButtonPressed: {
    opacity: 0.85,
  },
  favoriteIconButtonDisabled: {
    opacity: 0.5,
  },
  favoriteIconText: {
    color: '#fde68a',
    fontSize: 19,
    lineHeight: 19,
  },
  shareIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
  },
  shareIconButtonPressed: {
    opacity: 0.85,
  },
  shareIconButtonDisabled: {
    opacity: 0.5,
  },
  shareIconText: {
    color: '#bae6fd',
    fontSize: 16,
    lineHeight: 16,
    fontWeight: '500',
  },
  commentIconButton: {
    minWidth: 40,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
    paddingHorizontal: 6,
  },
  commentIconButtonPressed: {
    opacity: 0.85,
  },
  commentIconButtonDisabled: {
    opacity: 0.5,
  },
  commentIconText: {
    fontSize: 14,
  },
  commentCountText: {
    color: '#f8fafc',
    fontSize: 10,
    fontWeight: '500',
    marginTop: -2,
  },
  questionContainer: {
    flex: 1,
    minHeight: 0,
  },
  favoriteHintOverlay: {
    position: 'absolute',
    right: 18,
    top: 64,
    zIndex: 10,
    alignItems: 'flex-end',
  },
  favoriteHintBubble: {
    maxWidth: 270,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  favoriteHintTitle: {
    color: '#f8fafc',
    fontWeight: '500',
    marginBottom: 4,
  },
  favoriteHintText: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
  },
  favoriteHintButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
    backgroundColor: '#0e7490',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  favoriteHintButtonText: {
    color: '#ecfeff',
    fontWeight: '500',
    fontSize: 12,
  },
  favoriteHintArrow: {
    color: '#38bdf8',
    fontSize: 20,
    marginTop: 2,
    marginRight: 8,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  hiddenShareCanvas: {
    position: 'absolute',
    left: -10000,
    top: 0,
  },
  shareExportContainer: {
    width: 1080,
    height: 1920,
    paddingHorizontal: 84,
    paddingTop: 150,
    paddingBottom: 120,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  shareExportLogoWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  shareExportLogoTop: {
    color: '#e2e8f0',
    fontSize: 54,
    letterSpacing: 6,
    fontWeight: '500',
    lineHeight: 60,
    textAlign: 'center',
  },
  shareExportLogoBottom: {
    color: '#67e8f9',
    fontSize: 88,
    lineHeight: 92,
    fontStyle: 'italic',
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(34, 211, 238, 0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  shareExportCard: {
    borderWidth: 2,
    borderColor: '#1f3b54',
    borderRadius: 40,
    paddingHorizontal: 42,
    paddingVertical: 40,
    backgroundColor: 'rgba(15, 23, 42, 0.24)',
  },
  shareExportQuestion: {
    color: '#ffffff',
    fontSize: 72,
    lineHeight: 92,
    fontWeight: '500',
    marginBottom: 34,
  },
  shareExportOption: {
    borderWidth: 1,
    borderColor: '#22d3ee',
    borderRadius: 28,
    paddingVertical: 24,
    paddingHorizontal: 24,
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  shareExportOptionLabel: {
    color: '#a5f3fc',
    textTransform: 'uppercase',
    fontWeight: '500',
    fontSize: 22,
    marginBottom: 6,
  },
  shareExportOptionText: {
    color: '#f8fafc',
    fontSize: 52,
    lineHeight: 66,
    fontWeight: '500',
  },
  shareExportVsWrap: {
    alignItems: 'center',
    marginBottom: 10,
  },
  shareExportVsText: {
    color: '#a5f3fc',
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 1.6,
  },
  shareExportCtaRow: {
    alignItems: 'center',
    paddingBottom: 170,
  },
  shareExportCtaText: {
    color: '#bae6fd',
    fontSize: 40,
    fontWeight: '500',
    textAlign: 'center',
  },
  shareExportStoresRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  shareExportStoreText: {
    color: '#cbd5e1',
    fontSize: 28,
    fontWeight: '500',
  },
  questionTitle: {
    color: '#f8fafc',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '500',
    marginBottom: 14,
    textAlign: 'center',
  },
  arenaPanel: {
    borderWidth: 1,
    borderColor: '#1f3b54',
    borderRadius: 18,
    backgroundColor: '#0f172a',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  arenaBadge: {
    alignSelf: 'center',
    color: '#7dd3fc',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '500',
    marginBottom: 8,
  },
  arenaDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  arenaDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1f3b54',
  },
  arenaDividerText: {
    color: '#38bdf8',
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: '500',
  },
  optionsContainer: {
    marginTop: 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  helperText: {
    marginTop: 12,
    color: '#cbd5e1',
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 24,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 18, 32, 0.95)',
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#cbd5e1',
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 24,
  },
  errorText: {
    color: '#fca5a5',
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 16,
  },
  doneTitle: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: '500',
  },
  secondaryButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#f8fafc',
    fontWeight: '500',
    fontSize: 16,
  },
  commentsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.7)',
    justifyContent: 'flex-end',
  },
  commentsCard: {
    maxHeight: '78%',
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
  },
  commentsKeyboardLayer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  shareOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1400,
  },
  shareOverlayBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  shareOverlayTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.52)',
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  commentsTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '500',
  },
  commentsCloseButton: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  commentsCloseText: {
    color: '#e2e8f0',
    fontWeight: '500',
    fontSize: 12,
  },
  commentsList: {
    maxHeight: 280,
  },
  commentsListContent: {
    paddingBottom: 12,
  },
  commentsEmptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 14,
  },
  commentItem: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 10,
    marginBottom: 8,
  },
  commentAuthor: {
    color: '#93c5fd',
    fontWeight: '500',
    marginBottom: 4,
    fontSize: 12,
  },
  commentText: {
    color: '#e2e8f0',
    fontSize: 14,
    lineHeight: 20,
  },
  commentBodyTapArea: {
    borderRadius: 10,
  },
  commentFooter: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  commentDeleteButton: {
    borderWidth: 1,
    borderColor: '#7f1d1d',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#2b0b0b',
  },
  commentDeleteButtonPressed: {
    opacity: 0.86,
  },
  commentDeleteText: {
    color: '#fecaca',
    fontWeight: '500',
    fontSize: 12,
  },
  commentLikeButton: {
    minWidth: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#0b1220',
  },
  commentLikeButtonActive: {
    borderColor: '#fb7185',
    backgroundColor: '#3f1421',
  },
  commentLikeIcon: {
    color: '#fecdd3',
    fontSize: 14,
    lineHeight: 16,
    marginTop: -1,
    fontWeight: '500',
  },
  commentLikeCount: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '500',
  },
  commentInput: {
    minHeight: 72,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
    borderRadius: 12,
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    marginTop: 4,
  },
  commentSendButton: {
    marginTop: 10,
    backgroundColor: '#0e7490',
    borderRadius: 12,
    paddingVertical: 12,
  },
  commentSendButtonPressed: {
    opacity: 0.88,
  },
  commentSendButtonDisabled: {
    opacity: 0.65,
  },
  commentSendButtonText: {
    color: '#ecfeff',
    textAlign: 'center',
    fontWeight: '500',
  },
  infiltradoBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.8)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  infiltradoCard: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
  },
  infiltradoTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '500',
    marginBottom: 10,
  },
  infiltradoText: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  infiltradoInput: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 16,
  },
  infiltradoPrimaryButton: {
    backgroundColor: '#0e7490',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  infiltradoPrimaryButtonText: {
    color: '#ecfeff',
    fontWeight: '500',
    fontSize: 15,
  },
  infiltradoSecondaryButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  infiltradoSecondaryButtonText: {
    color: '#cbd5e1',
    fontWeight: '500',
    fontSize: 14,
  },
  infiltradoRoleBox: {
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  infiltradoRoleText: {
    color: '#e2e8f0',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
});
