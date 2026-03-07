import { useRouter, useLocalSearchParams } from 'expo-router';
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
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut, SlideInLeft, runOnJS, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import { AdBanner } from '../components/ads/AdBanner';
import { OptionButton } from '../components/OptionButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { ModoJogo } from '../models/game';
import {
  adicionarComentarioPergunta,
  alternarLikeComentario,
  buscarComentariosPergunta,
  ComentarioPergunta,
  contarComentariosPergunta,
  removerComentarioPergunta,
} from '../services/commentsService';
import { useGame } from '../hooks/useGame';
import { getModoLabel, isModoJogo } from '../utils/gameModes';

export function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; favoriteHint?: string }>();
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
  const shareGhostTapUntilRef = useRef(0);

  useEffect(() => {
    if (params.favoriteHint === '1') {
      setShowFavoriteHint(true);
    }
  }, [params.favoriteHint]);

  if (!params.mode || !isModoJogo(params.mode)) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Modo de jogo invalido.</Text>
          <Pressable style={styles.secondaryButton} onPress={() => router.replace('/')}>
            <Text style={styles.secondaryButtonText}>Voltar</Text>
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
    selectOption,
    previousQuestion,
    isFavorite,
    isFavoriteLoading,
    toggleFavorite,
    reload,
  } = useGame(modo);

  useEffect(() => {
    let isMounted = true;
    const loadCommentsCount = async () => {
      if (!currentQuestion) {
        if (isMounted) {
          setCommentsCount(0);
        }
        return;
      }

      try {
        const totalComments = await contarComentariosPergunta(currentQuestion);
        if (isMounted) {
          setCommentsCount(totalComments);
        }
      } catch {
        if (isMounted) {
          setCommentsCount(0);
        }
      }
    };

    void loadCommentsCount();

    return () => {
      isMounted = false;
    };
  }, [currentQuestion?.id, currentQuestion?.modo]);

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
    setTransitionType('back');
    previousQuestion();
  };

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([30, 9999])
    .failOffsetY([-20, 20])
    .onEnd((event: { translationX: number; translationY: number }) => {
      if (event.translationX > 70 && Math.abs(event.translationY) < 40) {
        runOnJS(handleSwipeBack)();
      }
    });

  const handleFavoritePress = () => {
    if (isShareOverlayVisible || isShareGhostTapActive()) {
      return;
    }
    favoriteScale.value = withSequence(withTiming(1.2, { duration: 110 }), withTiming(1, { duration: 110 }));
    void toggleFavorite();
  };

  const handleSelectOptionA = () => {
    if (isShareOverlayVisible || isShareGhostTapActive()) {
      return;
    }
    setTransitionType('default');
    selectOption('A');
  };

  const handleSelectOptionB = () => {
    if (isShareOverlayVisible || isShareGhostTapActive()) {
      return;
    }
    setTransitionType('default');
    selectOption('B');
  };

  const handleShareQuestion = async () => {
    if (!currentQuestion || !shareTemplateRef.current || isSharing || isShareOverlayVisible || isShareGhostTapActive()) {
      return;
    }

    setIsShareOverlayVisible(true);
    setIsSharing(true);
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Compartilhamento indisponivel', 'Seu dispositivo nao suporta compartilhamento nesta plataforma.');
        return;
      }

      const imageUri = await captureRef(shareTemplateRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      await Sharing.shareAsync(imageUri, {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: 'Compartilhar dilema',
      });
    } catch (error) {
      Alert.alert('Erro ao compartilhar', 'Nao foi possivel gerar a imagem da pergunta.');
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
      Alert.alert('Erro ao carregar comentarios', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setIsCommentsLoading(false);
    }
  };

  const handleOpenComments = () => {
    setShowCommentsModal(true);
    void loadComments();
  };

  const handleSubmitComment = async () => {
    if (!currentQuestion || isSendingComment) {
      return;
    }

    const normalized = commentInput.trim();
    if (normalized.length < 3) {
      Alert.alert('Comentario curto', 'Digite pelo menos 3 caracteres.');
      return;
    }

    setIsSendingComment(true);
    try {
      await adicionarComentarioPergunta(currentQuestion, normalized);
      setCommentInput('');
      await loadComments();
    } catch (error) {
      Alert.alert('Erro ao comentar', error instanceof Error ? error.message : 'Nao foi possivel enviar comentario.');
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
        Alert.alert('Erro ao curtir', error instanceof Error ? error.message : 'Nao foi possivel atualizar o like.');
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

    Alert.alert('Excluir comentario', 'Deseja excluir este comentario?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          const previousComments = comments;
          setComments((current) => current.filter((comment) => comment.id !== commentId));
          setCommentsCount((value) => Math.max(0, value - 1));

          void removerComentarioPergunta(currentQuestion, commentId).catch((error) => {
            setComments(previousComments);
            setCommentsCount(previousComments.length);
            Alert.alert('Erro ao excluir', error instanceof Error ? error.message : 'Nao foi possivel excluir o comentario.');
          });
        },
      },
    ]);
  };

  const isFinished = !isLoading && !error && total > 0 && currentQuestion === null;
  const shouldBlockGameTouches = showCommentsModal || isShareOverlayVisible;

  return (
    <ScreenContainer>
      <GestureDetector gesture={swipeGesture}>
        <View style={styles.gestureLayer} pointerEvents={shouldBlockGameTouches ? 'none' : 'auto'}>
          <View style={styles.topBar}>
          <Text style={styles.modeChip}>{getModoLabel(modo)}</Text>
          <View style={styles.topBarRight}>
            <Text style={styles.progress}>
              {Math.min(currentIndex + 1, total)}/{total || 0}
            </Text>
            <Pressable
              onPress={() => router.push({ pathname: '/tutorial' as never, params: { mode: modo, from: 'game' } })}
              style={({ pressed }) => [styles.tutorialIconButton, pressed && styles.tutorialIconButtonPressed]}
            >
              <Text style={styles.tutorialIconText}>?</Text>
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
          </View>
        </View>
        {showFavoriteHint ? (
          <View style={styles.favoriteHintOverlay}>
            <View style={styles.favoriteHintBubble}>
              <Text style={styles.favoriteHintTitle}>Dica rapida</Text>
              <Text style={styles.favoriteHintText}>
                Toque na estrela para favoritar este dilema e acessar depois no modo Favoritas.
              </Text>
              <Pressable onPress={() => setShowFavoriteHint(false)} style={styles.favoriteHintButton}>
                <Text style={styles.favoriteHintButtonText}>Entendi</Text>
              </Pressable>
            </View>
            <Text style={styles.favoriteHintArrow}>↗</Text>
          </View>
        ) : null}
        {!isLoading && error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.secondaryButton} onPress={reload}>
              <Text style={styles.secondaryButtonText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !error && total === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.helperText}>Nao encontramos perguntas nesse modo ainda.</Text>
            <Pressable style={styles.secondaryButton} onPress={() => router.replace('/')}>
              <Text style={styles.secondaryButtonText}>Escolher outro modo</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !error && isFinished ? (
          <View style={styles.centered}>
            <Text style={styles.doneTitle}>Fim da lista</Text>
            <Text style={styles.helperText}>Voce passou por todos os dilemas desse modo.</Text>
            <Pressable style={styles.secondaryButton} onPress={reload}>
              <Text style={styles.secondaryButtonText}>Jogar novamente</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => router.replace('/')}>
              <Text style={styles.secondaryButtonText}>Voltar para modos</Text>
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
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View>
                <Text style={styles.questionTitle}>{currentQuestion.titulo}</Text>
                <View style={styles.optionsContainer}>
                  <OptionButton
                    label="Opcao A"
                    value={currentQuestion.opcaoA}
                    isSelected={selectedOption === 'A'}
                    onPress={handleSelectOptionA}
                    disabled={selectedOption !== null || isShareOverlayVisible}
                  />
                  <OptionButton
                    label="Opcao B"
                    value={currentQuestion.opcaoB}
                    isSelected={selectedOption === 'B'}
                    onPress={handleSelectOptionB}
                    disabled={selectedOption !== null || isShareOverlayVisible}
                  />
                </View>
              </View>
            </ScrollView>
          </Animated.View>
          ) : null}
          {isLoading && shouldShowLoadingOverlay ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#22d3ee" />
            <Text style={styles.loadingText}>Carregando perguntas...</Text>
          </View>
          ) : null}
          {currentQuestion ? (
          <View style={styles.hiddenShareCanvas} pointerEvents="none">
            <View ref={shareTemplateRef} collapsable={false} style={styles.shareExportContainer}>
              <Text style={styles.shareExportAppName}>Dilemas Horríveis</Text>
              <View style={styles.shareExportCard}>
                <Text style={styles.shareExportQuestion}>{currentQuestion.titulo}</Text>
                <View style={styles.shareExportOption}>
                  <Text style={styles.shareExportOptionLabel}>Opcao A</Text>
                  <Text style={styles.shareExportOptionText}>{currentQuestion.opcaoA}</Text>
                </View>
                <View style={styles.shareExportVsWrap}>
                  <Text style={styles.shareExportVsText}>VS</Text>
                </View>
                <View style={styles.shareExportOption}>
                  <Text style={styles.shareExportOptionLabel}>Opcao B</Text>
                  <Text style={styles.shareExportOptionText}>{currentQuestion.opcaoB}</Text>
                </View>
              </View>
              <View style={styles.shareExportCtaRow}>
                <Text style={styles.shareExportCtaText}>Baixe o app</Text>
                <Text style={styles.shareExportStoreText}> App Store</Text>
                <Text style={styles.shareExportStoreText}>▶ Google Play</Text>
              </View>
            </View>
          </View>
          ) : null}
          <AdBanner />
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
              <Text style={styles.commentsTitle}>Comentarios</Text>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  setShowCommentsModal(false);
                }}
                style={styles.commentsCloseButton}
              >
                <Text style={styles.commentsCloseText}>Fechar</Text>
              </Pressable>
            </View>
            <ScrollView
              style={styles.commentsList}
              contentContainerStyle={styles.commentsListContent}
              keyboardShouldPersistTaps="always"
            >
              {isCommentsLoading ? <ActivityIndicator color="#22d3ee" /> : null}
              {!isCommentsLoading && comments.length === 0 ? (
                <Text style={styles.commentsEmptyText}>Seja o primeiro a comentar essa pergunta.</Text>
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
                        <Text style={styles.commentDeleteText}>Excluir</Text>
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
              placeholder="Conte sua historia..."
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
              <Text style={styles.commentSendButtonText}>{isSendingComment ? 'Enviando...' : 'Enviar comentario'}</Text>
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  gestureLayer: {
    flex: 1,
  },
  topBar: {
    marginTop: 8,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeChip: {
    color: '#a5f3fc',
    backgroundColor: '#0e7490',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontWeight: '500',
    fontSize: 14,
  },
  progress: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    paddingBottom: 24,
  },
  hiddenShareCanvas: {
    position: 'absolute',
    left: -10000,
    top: 0,
  },
  shareExportContainer: {
    width: 360,
    padding: 18,
    backgroundColor: 'transparent',
  },
  shareExportAppName: {
    color: '#ffffff',
    fontSize: 27,
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'left',
  },
  shareExportCard: {
    borderWidth: 2,
    borderColor: '#67e8f9',
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#0b1220cc',
  },
  shareExportQuestion: {
    color: '#ffffff',
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '500',
    marginBottom: 14,
  },
  shareExportOption: {
    borderWidth: 1,
    borderColor: '#22d3ee',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#0f172acc',
  },
  shareExportOptionLabel: {
    color: '#a5f3fc',
    textTransform: 'uppercase',
    fontWeight: '500',
    fontSize: 11,
    marginBottom: 4,
  },
  shareExportOptionText: {
    color: '#f8fafc',
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '500',
  },
  shareExportVsWrap: {
    alignItems: 'center',
    marginBottom: 8,
  },
  shareExportVsText: {
    color: '#a5f3fc',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 1,
  },
  shareExportCtaRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  shareExportCtaText: {
    color: '#bae6fd',
    fontSize: 12,
    fontWeight: '500',
  },
  shareExportStoreText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '500',
  },
  questionTitle: {
    color: '#f8fafc',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '500',
    marginBottom: 20,
  },
  optionsContainer: {
    marginTop: 10,
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
});
