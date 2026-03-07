import { Pressable, StyleSheet, Text } from 'react-native';

interface ModeCardProps {
  title: string;
  onPress: () => void;
}

export function ModeCard({ title, onPress }: ModeCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  text: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '500',
    textAlign: 'center',
  },
});
