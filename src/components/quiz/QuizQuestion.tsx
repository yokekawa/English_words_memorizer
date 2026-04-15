import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { QuizMode } from '@/types';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants';
import { getQuizModeConfig } from '@/constants/quizModes';

interface QuizQuestionProps {
  prompt: string;
  mode: QuizMode;
  questionNumber: number;
  totalQuestions: number;
}

export default function QuizQuestion({
  prompt,
  mode,
  questionNumber,
  totalQuestions,
}: QuizQuestionProps) {
  const config = getQuizModeConfig(mode);

  return (
    <View style={styles.container}>
      <View style={[styles.modeBadge, { backgroundColor: config.color }]}>
        <Text style={styles.modeIcon}>{config.icon}</Text>
        <Text style={styles.modeLabel}>{config.label}</Text>
      </View>

      <Text style={styles.counter}>
        {questionNumber} / {totalQuestions}
      </Text>

      <View style={styles.promptBox}>
        <Text style={styles.promptLabel}>問題</Text>
        <Text style={styles.prompt}>{prompt}</Text>
      </View>

      <Text style={styles.instruction}>英語でスペルを入力してください</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  modeIcon: {
    fontSize: FontSize.md,
  },
  modeLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textOnPrimary,
  },
  counter: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  promptBox: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    minHeight: 120,
    justifyContent: 'center',
  },
  promptLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  prompt: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  instruction: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
});
