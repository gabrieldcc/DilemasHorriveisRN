import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '../components/ScreenContainer';
import { markTutorialAsSeen } from '../hooks/useTutorialGate';
import { isModoJogo } from '../utils/gameModes';

export function TutorialScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; from?: string }>();
  const [loading, setLoading] = useState(false);

  const mode = params.mode;
  const openedFromGame = params.from === 'game';
  const hasValidMode = Boolean(mode && isModoJogo(mode));

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
    await markTutorialAsSeen();
    router.replace({ pathname: '/game', params: { mode: mode as string } });
  };

  return (
    <ScreenContainer>
      <View style={styles.wrapper}>
        <Text style={styles.title}>Como jogar</Text>
        <Text style={styles.text}>Esse jogo pode ser jogado individualmente ou em grupo.</Text>
        <Text style={styles.text}>A ideia e gerar um debate sobre as respostas antes de escolher.</Text>
        <Text style={styles.text}>1. Leia o dilema exibido na tela.</Text>
        <Text style={styles.text}>2. Escolha entre a opcao A ou B.</Text>
        <Text style={styles.text}>3. Se estiver em grupo, escolham a resposta mais votada.</Text>
        <Text style={styles.text}>4. A proxima pergunta aparece automaticamente.</Text>
        <Text style={styles.text}>5. Continue ate acabar a lista do modo.</Text>

        <Pressable onPress={startGame} disabled={loading} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
          <Text style={styles.buttonText}>
            {openedFromGame
              ? 'Voltar ao jogo'
              : hasValidMode
                ? loading
                  ? 'Entrando...'
                  : 'Entendi, comecar'
                : 'Voltar aos modos'}
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: '#f8fafc',
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 20,
  },
  text: {
    color: '#cbd5e1',
    fontSize: 20,
    lineHeight: 28,
    marginBottom: 10,
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
    fontWeight: '800',
    fontSize: 18,
  },
});
