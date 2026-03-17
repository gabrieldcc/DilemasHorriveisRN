import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '../components/ScreenContainer';
import { getGameModeById } from '../config/remoteConfig';
import { hasSeenTutorial, markModeTutorialAsSeen, markTutorialAsSeen } from '../hooks/useTutorialGate';
import { BUILTIN_MODE_IDS, ModoJogo } from '../models/game';
import { useAppTranslation } from '../i18n';
import { getLocalizedTextSync } from '../i18n';
import { isModoJogo } from '../utils/gameModes';

export function TutorialScreen() {
  const router = useRouter();
  const { t } = useAppTranslation();
  const params = useLocalSearchParams<{ mode?: string; from?: string; gameType?: string }>();
  const [loading, setLoading] = useState(false);

  const mode = params.mode;
  const gameType = params.gameType === 'infiltrado' ? 'infiltrado' : 'classic';
  const openedFromGame = params.from === 'game';
  const hasValidMode = Boolean(mode && isModoJogo(mode));
  const modeConfig = mode ? getGameModeById(mode) : undefined;
  const fallbackPages = [
    {
      title: t('tutorial.defaultPages.page1Title'),
      body: t('tutorial.defaultPages.page1Body'),
    },
    {
      title: t('tutorial.defaultPages.page2Title'),
      body: t('tutorial.defaultPages.page2Body'),
    },
    {
      title: t('tutorial.defaultPages.page3Title'),
      body: t('tutorial.defaultPages.page3Body'),
    },
  ];
  const tutorialPages =
    modeConfig?.tutorial?.enabled && (modeConfig.tutorial.pages.length ?? 0) > 0
      ? modeConfig.tutorial.pages.map((page) => ({
          title: getLocalizedTextSync(page.title),
          body: getLocalizedTextSync(page.body),
        }))
      : fallbackPages;

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
          <Text style={styles.title}>{modeConfig ? getLocalizedTextSync(modeConfig.title, t('tutorial.fallbackTitle')) : t('tutorial.title')}</Text>
          {tutorialPages.map((page) => (
            <View key={`${page.title}-${page.body}`} style={styles.pageBlock}>
              <Text style={styles.modeTipsTitle}>{page.title}</Text>
              <Text style={styles.text}>{page.body}</Text>
            </View>
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
    marginBottom: 8,
  },
  pageBlock: {
    marginBottom: 12,
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
