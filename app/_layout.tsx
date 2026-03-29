import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { initializeCrashlytics, logCrashlyticsMessage, recordCrashlyticsError } from '../src/services/crashlytics';
import { getFirebaseFirestore } from '../src/services/firebase';
import { hydrateLanguageOverride } from '../src/services/languageService';
import { initRemoteConfig } from '../src/services/RemoteConfigService';
import { AnalyticsService } from '../src/services/analyticsService';
import { resetSession } from '../src/utils/sessionManager';
import { isFirstLaunch } from '../src/utils/firstLaunchManager';
import { useFeatureFlagsStore } from '../src/store/featureFlagsStore';
import { t } from '../src/i18n';

function getFirebaseErrorCode(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  return null;
}

function isPermissionDeniedError(error: unknown): boolean {
  const code = getFirebaseErrorCode(error)?.toLowerCase() ?? '';
  if (code.includes('permission-denied')) {
    return true;
  }

  const message =
    typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
      ? error.message.toLowerCase()
      : '';

  return message.includes('missing or insufficient permissions');
}

export default function RootLayout() {
  const startListeningFeatureFlags = useFeatureFlagsStore((state) => state.startListening);
  const stopListeningFeatureFlags = useFeatureFlagsStore((state) => state.stopListening);

  useEffect(() => {
    void hydrateLanguageOverride();
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
        const checkRef = query(collection(db, 'perguntas', 'nerd', 'itens'), limit(1));
        await getDocs(checkRef);
        logCrashlyticsMessage('Firebase startup check concluído com sucesso.');
        if (__DEV__) {
          console.info('[Firebase] Startup check concluído com sucesso.');
        }
      } catch (error) {
        if (isPermissionDeniedError(error)) {
          logCrashlyticsMessage('Firebase startup check sem permissão (ignorado).');
          if (__DEV__) {
            console.warn('[Firebase] Startup check sem permissão. Verifique as regras do Firestore se isso não for esperado.');
          }
          return;
        }

        recordCrashlyticsError(error, 'Falha no Firebase startup check');
        if (__DEV__) {
          const message = error instanceof Error ? error.message : 'Erro desconhecido no startup check.';
          console.error(`[Firebase] Startup check falhou: ${message}`);
        }
      }
    };

    if (__DEV__) {
      void runFirebaseStartupCheck();
    }

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
        <Stack.Screen name="tutorial" options={{ title: t('layout.tutorial') }} />
        <Stack.Screen name="game" options={{ title: 'BadPick' }} />
        <Stack.Screen name="suggest" options={{ title: t('layout.suggest') }} />
        <Stack.Screen name="admin" options={{ title: t('layout.admin') }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
