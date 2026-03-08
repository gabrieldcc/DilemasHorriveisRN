import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '../components/ScreenContainer';
import { hasSeenTutorial, markModeTutorialAsSeen, markTutorialAsSeen } from '../hooks/useTutorialGate';
import { ModoJogo } from '../models/game';
import { isModoJogo } from '../utils/gameModes';

export function TutorialScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; from?: string; gameType?: string }>();
  const [loading, setLoading] = useState(false);

  const mode = params.mode;
  const gameType = params.gameType === 'infiltrado' ? 'infiltrado' : 'classic';
  const openedFromGame = params.from === 'game';
  const hasValidMode = Boolean(mode && isModoJogo(mode));

  const getModeSpecificTips = () => {
    if (!hasValidMode || !mode) {
      return null;
    }

    if (mode === ModoJogo.favoritas) {
      return [
        'Modo Favoritas: aqui ficam as perguntas que você marcou com estrela.',
        'Use este modo para revisitar dilemas que renderam mais discussão no seu grupo.',
      ];
    }

    if (mode === ModoJogo.comunidade) {
      return [
        'Modo Comunidade: mostra perguntas mais favoritadas pelos jogadores.',
        'Quanto mais pessoas favoritam uma pergunta, mais ela sobe no ranking.',
      ];
    }

    return null;
  };

  const modeSpecificTips = getModeSpecificTips();

  const startGame = async () => {
    if (openedFromGame) {
      router.back();
      return;
    }

    if (!hasValidMode) {
      router.replace('/');
      return;
    }

    setLoading(true);
    const firstAppTutorial = !(await hasSeenTutorial());
    await markTutorialAsSeen();
    await markModeTutorialAsSeen(mode as ModoJogo);
    router.replace({
      pathname: '/game',
      params: {
        mode: mode as string,
        gameType,
        favoriteHint: firstAppTutorial ? '1' : undefined,
      },
    });
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.wrapper}>
          <Text style={styles.title}>Como jogar</Text>
          <Text style={styles.text}>Esse jogo pode ser jogado individualmente ou em grupo.</Text>
          <Text style={styles.text}>A ideia é gerar um debate sobre as respostas antes de escolher.</Text>
          <Text style={styles.text}>1. Leia o dilema exibido na tela.</Text>
          <Text style={styles.text}>2. Escolha entre a opção A ou B.</Text>
          <Text style={styles.text}>3. Se estiver em grupo, escolham a resposta mais votada.</Text>
          <Text style={styles.text}>4. A próxima pergunta aparece automaticamente.</Text>
          <Text style={styles.text}>5. Continue até acabar a lista do modo.</Text>
          {modeSpecificTips ? <Text style={styles.modeTipsTitle}>Sobre este modo</Text> : null}
          {modeSpecificTips?.map((tip) => (
            <Text key={tip} style={styles.text}>
              • {tip}
            </Text>
          ))}

          <Pressable
            onPress={startGame}
            disabled={loading}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>
              {openedFromGame
                ? 'Voltar ao jogo'
                : hasValidMode
                  ? loading
                    ? 'Entrando...'
                    : 'Entendi, começar'
                  : 'Voltar aos modos'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  wrapper: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    color: '#f8fafc',
    fontSize: 34,
    fontWeight: '500',
    marginBottom: 20,
  },
  text: {
    color: '#cbd5e1',
    fontSize: 20,
    lineHeight: 28,
    marginBottom: 10,
  },
  modeTipsTitle: {
    color: '#e2e8f0',
    fontSize: 22,
    fontWeight: '500',
    marginTop: 10,
    marginBottom: 8,
  },
  button: {
    marginTop: 24,
    backgroundColor: '#0891b2',
    paddingVertical: 14,
    borderRadius: 14,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: '#ecfeff',
    textAlign: 'center',
    fontWeight: '500',
    fontSize: 18,
  },
});
