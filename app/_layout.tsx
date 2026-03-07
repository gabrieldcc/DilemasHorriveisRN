import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { doc, getDoc } from 'firebase/firestore';

import { getFirebaseFirestore } from '../src/services/firebase';

export default function RootLayout() {
  useEffect(() => {
    const runFirebaseStartupCheck = async () => {
      try {
        const db = getFirebaseFirestore();
        await getDoc(doc(db, 'perguntas', 'leve'));
        if (__DEV__) {
          console.info('[Firebase] Startup check concluido com sucesso.');
        }
      } catch (error) {
        if (__DEV__) {
          const message = error instanceof Error ? error.message : 'Erro desconhecido no startup check.';
          console.error(`[Firebase] Startup check falhou: ${message}`);
        }
      }
    };

    void runFirebaseStartupCheck();
  }, []);

  return (
    <>
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
        <Stack.Screen name="game" options={{ title: 'Dilemas Horriveis' }} />
        <Stack.Screen name="admin" options={{ title: 'Administrador' }} />
      </Stack>
    </>
  );
}
