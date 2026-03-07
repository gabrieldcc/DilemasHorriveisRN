import { useRouter, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { OptionButton } from '../components/OptionButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { ModoJogo } from '../models/game';
import { useGame } from '../hooks/useGame';
import { getModoLabel, isModoJogo } from '../utils/gameModes';

export function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();

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
            onPress={() => void toggleFavorite()}
            disabled={!currentQuestion || isFavoriteLoading}
            style={({ pressed }) => [
              styles.favoriteIconButton,
              isFavorite && styles.favoriteIconButtonActive,
              pressed && styles.favoriteIconButtonPressed,
              (!currentQuestion || isFavoriteLoading) && styles.favoriteIconButtonDisabled,
            ]}
          >
            <Text style={styles.favoriteIconText}>{isFavorite ? '★' : '☆'}</Text>
          </Pressable>
        </View>
      </View>

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
          </ScrollView>
        </Animated.View>
      ) : null}
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
  questionContainer: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
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
