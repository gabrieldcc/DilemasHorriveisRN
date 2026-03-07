import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ModeCard } from '../components/ModeCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { GAME_MODES } from '../utils/gameModes';

export function ModeSelectionScreen() {
  const router = useRouter();

  return (
    <ScreenContainer>
      <View style={styles.headerContainer}>
        <Pressable onLongPress={() => router.push('/admin')} delayLongPress={900}>
          <Text style={styles.title}>Dilemas Horriveis</Text>
        </Pressable>
        <Text style={styles.subtitle}>Escolha um modo para comecar</Text>
      </View>

      <View style={styles.listContainer}>
        {GAME_MODES.map((mode) => (
          <ModeCard
            key={mode.value}
            title={mode.label}
            onPress={() =>
              router.push({
                pathname: '/game',
                params: { mode: mode.value },
              })
            }
          />
        ))}
      </View>

      <Text style={styles.hint}>Dica: segure o titulo por 1 segundo para o modo admin.</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    marginTop: 20,
    marginBottom: 24,
  },
  title: {
    color: '#f8fafc',
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 8,
    color: '#94a3b8',
    fontSize: 18,
  },
  listContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  hint: {
    color: '#475569',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
});
