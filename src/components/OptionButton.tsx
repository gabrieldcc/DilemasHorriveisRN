import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

interface OptionButtonProps {
  label: string;
  value: string;
  isSelected: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export function OptionButton({ label, value, isSelected, disabled, onPress }: OptionButtonProps) {
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
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 18,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 130,
    justifyContent: 'center',
  },
  selected: {
    borderColor: '#22d3ee',
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.75,
  },
  optionLabel: {
    color: '#93c5fd',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  optionText: {
    color: '#f8fafc',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '500',
  },
});
