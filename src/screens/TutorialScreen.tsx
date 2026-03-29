import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '../components/ScreenContainer';
import { hasSeenTutorial, markModeTutorialAsSeen, markTutorialAsSeen } from '../hooks/useTutorialGate';
import { ModoJogo } from '../models/game';
import { isModoJogo } from '../utils/gameModes';
import { t } from '../i18n';

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
        t('tutorial.favorites.tip1'),
        t('tutorial.favorites.tip2'),
      ];
    }

    if (mode === ModoJogo.comunidade) {
      return [
        t('tutorial.community.tip1'),
        t('tutorial.community.tip2'),
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
          <Text style={styles.title}>{t('tutorial.title')}</Text>
          <Text style={styles.text}>{t('tutorial.line1')}</Text>
          <Text style={styles.text}>{t('tutorial.line2')}</Text>
          <Text style={styles.text}>{t('tutorial.step1')}</Text>
          <Text style={styles.text}>{t('tutorial.step2')}</Text>
          <Text style={styles.text}>{t('tutorial.step3')}</Text>
          <Text style={styles.text}>{t('tutorial.step4')}</Text>
          <Text style={styles.text}>{t('tutorial.step5')}</Text>
          {modeSpecificTips ? <Text style={styles.modeTipsTitle}>{t('tutorial.aboutMode')}</Text> : null}
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
                ? t('tutorial.backToGame')
                : hasValidMode
                  ? loading
                    ? t('tutorial.entering')
                    : t('tutorial.start')
                  : t('tutorial.backToModes')}
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
