import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import { AdBanner } from '../components/ads/AdBanner';
import { OptionButton } from '../components/OptionButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { ModoJogo } from '../models/game';
import { useGame } from '../hooks/useGame';
import { getModoLabel, isModoJogo } from '../utils/gameModes';

export function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; favoriteHint?: string }>();
  const [showFavoriteHint, setShowFavoriteHint] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

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
    isFavorite,
    isFavoriteLoading,
    toggleFavorite,
    reload,
  } = useGame(modo);
  const favoriteScale = useSharedValue(1);
  const shareTemplateRef = useRef<View | null>(null);
  const favoriteIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: favoriteScale.value }],
  }));

  const handleFavoritePress = () => {
    favoriteScale.value = withSequence(withTiming(1.2, { duration: 110 }), withTiming(1, { duration: 110 }));
    void toggleFavorite();
  };

  const handleShareQuestion = async () => {
    if (!currentQuestion || !shareTemplateRef.current || isSharing) {
      return;
    }

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
    }
  };

  const isFinished = !isLoading && !error && total > 0 && currentQuestion === null;

  return (
    <ScreenContainer>
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
            disabled={!currentQuestion || isFavoriteLoading}
            style={({ pressed }) => [
              styles.favoriteIconButton,
              isFavorite && styles.favoriteIconButtonActive,
              pressed && styles.favoriteIconButtonPressed,
              (!currentQuestion || isFavoriteLoading) && styles.favoriteIconButtonDisabled,
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
            disabled={!currentQuestion || isSharing}
            style={({ pressed }) => [
              styles.shareIconButton,
              pressed && styles.shareIconButtonPressed,
              (!currentQuestion || isSharing) && styles.shareIconButtonDisabled,
            ]}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color="#bae6fd" />
            ) : (
              <Text style={styles.shareIconText}>↗</Text>
            )}
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

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#22d3ee" />
          <Text style={styles.helperText}>Carregando perguntas...</Text>
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
          entering={FadeIn.duration(220)}
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
                  onPress={() => selectOption('A')}
                  disabled={selectedOption !== null}
                />
                <OptionButton
                  label="Opcao B"
                  value={currentQuestion.opcaoB}
                  isSelected={selectedOption === 'B'}
                  onPress={() => selectOption('B')}
                  disabled={selectedOption !== null}
                />
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      ) : null}
      {currentQuestion ? (
        <View style={styles.hiddenShareCanvas} pointerEvents="none">
          <View ref={shareTemplateRef} collapsable={false} style={styles.shareExportContainer}>
            <Text style={styles.shareExportAppName}>Dilemas Horríveis</Text>
            <Text style={styles.shareExportQuestion}>{currentQuestion.titulo}</Text>
            <View style={styles.shareExportOption}>
              <Text style={styles.shareExportOptionLabel}>Opcao A</Text>
              <Text style={styles.shareExportOptionText}>{currentQuestion.opcaoA}</Text>
            </View>
            <View style={styles.shareExportOption}>
              <Text style={styles.shareExportOptionLabel}>Opcao B</Text>
              <Text style={styles.shareExportOptionText}>{currentQuestion.opcaoB}</Text>
            </View>
          </View>
        </View>
      ) : null}
      <AdBanner />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
    fontWeight: '700',
    fontSize: 14,
  },
  progress: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
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
    fontWeight: '800',
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
    fontWeight: '700',
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
    fontWeight: '800',
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
    fontWeight: '700',
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
    width: 340,
    padding: 16,
    backgroundColor: 'transparent',
  },
  shareExportAppName: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 12,
    textAlign: 'center',
  },
  shareExportQuestion: {
    color: '#ffffff',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    marginBottom: 14,
  },
  shareExportOption: {
    borderWidth: 2,
    borderColor: '#67e8f9',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: '#0b122033',
  },
  shareExportOptionLabel: {
    color: '#a5f3fc',
    textTransform: 'uppercase',
    fontWeight: '800',
    fontSize: 12,
    marginBottom: 4,
  },
  shareExportOptionText: {
    color: '#f8fafc',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  questionTitle: {
    color: '#f8fafc',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
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
    fontWeight: '800',
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
    fontWeight: '700',
    fontSize: 16,
  },
});
