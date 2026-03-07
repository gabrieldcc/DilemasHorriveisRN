import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0b1220' },
          headerTintColor: '#f8fafc',
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
