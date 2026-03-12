import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

interface OptionButtonProps {
  label: string;
  value: string;
  isSelected: boolean;
  showResult?: boolean;
  percentage?: number | null;
  isUserChoice?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export function OptionButton({
  label,
  value,
  isSelected,
  showResult = false,
  percentage = null,
  isUserChoice = false,
  disabled,
  onPress,
}: OptionButtonProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withTiming(isSelected ? 0.96 : 1, { duration: 140 });
  }, [isSelected, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          isSelected && styles.selected,
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.optionText}>{value}</Text>
        {showResult && percentage !== null ? (
          <View style={styles.resultRow}>
            <View style={[styles.resultBar, isUserChoice ? styles.resultBarActive : styles.resultBarInactive]}>
              <View style={[styles.resultFill, { width: `${Math.min(Math.max(percentage, 0), 100)}%` }]} />
            </View>
            <Text style={[styles.resultText, isUserChoice && styles.resultTextActive]}>{percentage}%</Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#131f36',
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#27405d',
    minHeight: 130,
    justifyContent: 'center',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  selected: {
    borderColor: '#22d3ee',
    backgroundColor: '#0f2a3a',
    shadowOpacity: 0.26,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.8,
  },
  optionLabel: {
    color: '#7dd3fc',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  optionText: {
    color: '#f8fafc',
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '500',
  },
  resultRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resultBar: {
    flex: 1,
    height: 10,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#0b2133',
    borderWidth: 1,
    borderColor: '#1f4f75',
  },
  resultBarActive: {
    borderColor: '#22d3ee',
  },
  resultBarInactive: {
    borderColor: '#1e293b',
  },
  resultFill: {
    height: '100%',
    backgroundColor: '#22d3ee',
  },
  resultText: {
    color: '#cbd5e1',
    fontWeight: '600',
  },
  resultTextActive: {
    color: '#22d3ee',
  },
});
