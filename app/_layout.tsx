import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { doc, getDoc } from 'firebase/firestore';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAppTranslation, initI18n } from '../src/i18n';
import { initializeCrashlytics, logCrashlyticsMessage, recordCrashlyticsError } from '../src/services/crashlytics';
import { getFirebaseFirestore } from '../src/services/firebase';
import { initRemoteConfig } from '../src/services/RemoteConfigService';
import { AnalyticsService } from '../src/services/AnalyticsService';
import { resetSession } from '../src/utils/sessionManager';
import { isFirstLaunch } from '../src/utils/firstLaunchManager';
import { useFeatureFlagsStore } from '../src/store/featureFlagsStore';

export default function RootLayout() {
  const { t } = useAppTranslation();
  const startListeningFeatureFlags = useFeatureFlagsStore((state) => state.startListening);
  const stopListeningFeatureFlags = useFeatureFlagsStore((state) => state.stopListening);

  useEffect(() => {
    void initI18n();
    void initializeCrashlytics();
    void initRemoteConfig();
    resetSession();
    void AnalyticsService.trackAppOpen();
    void AnalyticsService.trackSessionStart();
    void isFirstLaunch();
    startListeningFeatureFlags();

    const runFirebaseStartupCheck = async () => {
      try {
        const db = getFirebaseFirestore();
        await getDoc(doc(db, 'perguntas', 'leve'));
        logCrashlyticsMessage('Firebase startup check concluído com sucesso.');
        if (__DEV__) {
          console.info('[Firebase] Startup check concluído com sucesso.');
        }
      } catch (error) {
        recordCrashlyticsError(error, 'Falha no Firebase startup check');
        if (__DEV__) {
          const message = error instanceof Error ? error.message : 'Erro desconhecido no startup check.';
          console.error(`[Firebase] Startup check falhou: ${message}`);
        }
      }
    };

    void runFirebaseStartupCheck();

    return () => {
      stopListeningFeatureFlags();
    };
  }, [startListeningFeatureFlags, stopListeningFeatureFlags]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0b1220' },
          headerTintColor: '#f8fafc',
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: '#0b1220' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="tutorial" options={{ title: t('navigation.tutorial') }} />
        <Stack.Screen name="game" options={{ title: t('navigation.game') }} />
        <Stack.Screen name="suggest" options={{ title: t('navigation.suggest') }} />
        <Stack.Screen name="admin" options={{ title: t('navigation.admin') }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
