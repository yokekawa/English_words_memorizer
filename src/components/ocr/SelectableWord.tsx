import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants';

type WordStatus = 'idle' | 'selected' | 'loading' | 'registered' | 'error';

interface SelectableWordProps {
  word: string;
  status: WordStatus;
  onPress: () => void;
}

export default function SelectableWord({
  word,
  status,
  onPress,
}: SelectableWordProps) {
  const containerStyle = [styles.base, styles[`status_${status}`]];
  const textStyle = [styles.text, styles[`text_${status}`]];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={status === 'loading' || status === 'registered'}
      activeOpacity={0.75}
    >
      {status === 'loading' ? (
        <ActivityIndicator size="small" color={Colors.primary} />
      ) : (
        <Text style={textStyle}>
          {status === 'registered' ? '✓ ' : ''}
          {word}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    margin: 3,
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  status_idle: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  status_selected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  status_loading: {
    backgroundColor: Colors.surfaceSecondary,
    borderColor: Colors.border,
    minWidth: 60,
  },
  status_registered: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success,
  },
  status_error: {
    backgroundColor: Colors.errorLight,
    borderColor: Colors.error,
  },
  text: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  text_idle: { color: Colors.text },
  text_selected: { color: Colors.primary },
  text_loading: { color: Colors.textSecondary },
  text_registered: { color: Colors.success },
  text_error: { color: Colors.error },
});
