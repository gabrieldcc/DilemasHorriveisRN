import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { doc, getDoc } from 'firebase/firestore';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { initializeCrashlytics, logCrashlyticsMessage, recordCrashlyticsError } from '../src/services/crashlytics';
import { getFirebaseFirestore } from '../src/services/firebase';
import { useFeatureFlagsStore } from '../src/store/featureFlagsStore';

export default function RootLayout() {
  const startListeningFeatureFlags = useFeatureFlagsStore((state) => state.startListening);
  const stopListeningFeatureFlags = useFeatureFlagsStore((state) => state.stopListening);

  useEffect(() => {
    void initializeCrashlytics();
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
        <Stack.Screen name="tutorial" options={{ title: 'Tutorial' }} />
        <Stack.Screen name="game" options={{ title: 'Dilemas Horríveis' }} />
        <Stack.Screen name="suggest" options={{ title: 'Sugerir dilema' }} />
        <Stack.Screen name="admin" options={{ title: 'Administrador' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
