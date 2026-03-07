import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ModeCardProps {
  title: string;
  subtitle?: string;
  icon?: string;
  tag?: string;
  onPress: () => void;
}

export function ModeCard({ title, subtitle, icon, tag, onPress }: ModeCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.topRow}>
        <View style={styles.leftWrap}>
          {icon ? <Text style={styles.icon}>{icon}</Text> : null}
          <Text style={styles.text}>{title}</Text>
        </View>
        {tag ? (
          <View style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ) : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f3b54',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  leftWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  icon: {
    fontSize: 18,
  },
  text: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '500',
  },
  subtitle: {
    marginTop: 8,
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
  },
  tag: {
    borderWidth: 1,
    borderColor: '#155e75',
    backgroundColor: '#082f49',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    color: '#a5f3fc',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.4,
  },
});
