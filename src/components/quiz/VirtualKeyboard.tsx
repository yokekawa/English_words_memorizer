import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants';
import { useSettingsStore } from '@/store/settingsStore';

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  currentInput: string;
  disabled?: boolean;
}

export default function VirtualKeyboard({
  onKeyPress,
  onBackspace,
  onSubmit,
  currentInput,
  disabled = false,
}: VirtualKeyboardProps) {
  const hapticEnabled = useSettingsStore(s => s.hapticEnabled);

  const handleKey = (key: string) => {
    if (disabled) return;
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onKeyPress(key.toLowerCase());
  };

  const handleBackspace = () => {
    if (disabled) return;
    if (hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onBackspace();
  };

  const handleSubmit = () => {
    if (disabled || !currentInput) return;
    if (hapticEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onSubmit();
  };

  return (
    <View style={styles.container}>
      {ROWS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {rowIndex === 2 && (
            <TouchableOpacity
              style={[styles.key, styles.actionKey, styles.backspaceKey]}
              onPress={handleBackspace}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <Text style={styles.actionKeyText}>⌫</Text>
            </TouchableOpacity>
          )}
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
          {rowIndex === 2 && (
            <TouchableOpacity
              style={[
                styles.key,
                styles.actionKey,
                styles.submitKey,
                (!currentInput || disabled) && styles.submitDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!currentInput || disabled}
              activeOpacity={0.7}
            >
              <Text style={styles.actionKeyText}>✓</Text>
            </TouchableOpacity>
          )}
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
  actionKey: {
    maxWidth: 48,
    flex: 1.4,
  },
  actionKeyText: {
    fontSize: FontSize.lg,
    color: Colors.textOnPrimary,
    fontWeight: FontWeight.bold,
  },
  backspaceKey: {
    backgroundColor: Colors.keyboard.backspace,
  },
  submitKey: {
    backgroundColor: Colors.keyboard.submit,
  },
  submitDisabled: {
    opacity: 0.3,
  },
});
