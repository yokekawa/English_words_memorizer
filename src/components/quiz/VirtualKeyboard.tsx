import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants';
import { useSettingsStore } from '@/store/settingsStore';

const ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
];

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void;
  disabled?: boolean;
}

export default function VirtualKeyboard({
  onKeyPress,
  disabled = false,
}: VirtualKeyboardProps) {
  const hapticEnabled = useSettingsStore(s => s.hapticEnabled);

  const handleKey = (key: string) => {
    if (disabled) return;
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onKeyPress(key);
  };

  return (
    <View style={styles.container}>
      {ROWS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map(letter => (
            <TouchableOpacity
              key={letter}
              style={[styles.key, disabled && styles.keyDisabled]}
              onPress={() => handleKey(letter)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <Text style={styles.keyText}>{letter}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceSecondary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  key: {
    flex: 1,
    maxWidth: 36,
    height: 44,
    backgroundColor: Colors.keyboard.key,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  keyText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.keyboard.text,
  },
  keyDisabled: {
    opacity: 0.5,
  },
});
