import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants';

interface AnswerInputProps {
  value: string;
  maxLength?: number;
  isCorrect?: boolean | null;
  correctAnswer?: string;
  label?: string;
  /** Whether this field is the one currently accepting keystrokes */
  active?: boolean;
}

export default function AnswerInput({
  value,
  maxLength = 20,
  isCorrect = null,
  correctAnswer,
  label,
  active = true,
}: AnswerInputProps) {
  const displayLength = maxLength;
  const chars = value.split('');

  let borderColor: string = Colors.border;
  if (isCorrect === true) borderColor = Colors.success;
  if (isCorrect === false) borderColor = Colors.error;
  if (active && isCorrect === null) borderColor = Colors.primary;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputRow, { borderColor }]}>
        {Array.from({ length: displayLength }).map((_, i) => {
          const char = chars[i] ?? '';
          const isActiveCell = active && i === chars.length && isCorrect === null;

          return (
            <View
              key={i}
              style={[
                styles.cell,
                char ? styles.cellFilled : styles.cellEmpty,
                isActiveCell && styles.cellActive,
              ]}
            >
              <Text style={styles.cellText}>{char}</Text>
            </View>
          );
        })}
      </View>

      {isCorrect === false && correctAnswer && (
        <View style={styles.correctRow}>
          <Text style={styles.correctLabel}>正解: </Text>
          <Text style={styles.correctAnswer}>{correctAnswer}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    minHeight: 56,
  },
  cell: {
    width: 28,
    height: 36,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellEmpty: {
    backgroundColor: Colors.surfaceSecondary,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
  },
  cellFilled: {
    backgroundColor: Colors.primaryLight,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  cellActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    backgroundColor: Colors.surfaceSecondary,
  },
  cellText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  correctRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  correctLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  correctAnswer: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.success,
  },
});
