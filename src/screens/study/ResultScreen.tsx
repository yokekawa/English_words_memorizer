import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StudyStackParams, QuizResult } from '@/types';
import { useQuizStore } from '@/store/quizStore';
import { buildResult } from '@/services/scoringService';
import Button from '@/components/common/Button';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
} from '@/constants';
import { getQuizModeConfig } from '@/constants/quizModes';

type Props = NativeStackScreenProps<StudyStackParams, 'Result'>;

export default function ResultScreen({ navigation }: Props) {
  const session = useQuizStore(s => s.session);
  const clearSession = useQuizStore(s => s.clearSession);
  const startSession = useQuizStore(s => s.startSession);

  const result: QuizResult | null = session ? buildResult(session) : null;

  useEffect(() => {
    return () => {
      // Clean up when leaving result screen
    };
  }, []);

  if (!result) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>結果が見つかりません</Text>
        <Button
          label="学習ホームへ"
          onPress={() => {
            clearSession();
            navigation.replace('StudyHome');
          }}
        />
      </View>
    );
  }

  const modeConfig = getQuizModeConfig(result.mode);
  const accuracyPercent = Math.round(result.accuracy * 100);
  const minutes = Math.floor(result.durationMs / 60000);
  const seconds = Math.floor((result.durationMs % 60000) / 1000);

  const filterLabel =
    result.filter.type === 'date_range'
      ? `試験対策: ${result.filter.from} 〜 ${result.filter.to}`
      : result.filter.type === 'recent'
      ? `直近${result.filter.days}日`
      : '全単語';

  const handleRetry = async () => {
    clearSession();
    navigation.replace('StudyHome');
  };

  const handleRetryWithSameFilter = async () => {
    await startSession(result.mode, result.filter);
    const { session: newSession } = useQuizStore.getState();
    if (newSession) {
      navigation.replace('Quiz', { sessionId: newSession.id });
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Score card */}
      <View style={styles.scoreCard}>
        <Text style={styles.scoreEmoji}>
          {accuracyPercent >= 80 ? '🎉' : accuracyPercent >= 60 ? '👍' : '💪'}
        </Text>
        <Text style={styles.accuracyText}>{accuracyPercent}%</Text>
        <Text style={styles.scoreDetail}>
          {result.correctCount} / {result.totalQuestions} 問正解
        </Text>
        <Text style={styles.timeText}>
          {minutes > 0 ? `${minutes}分 ` : ''}{seconds}秒
        </Text>
      </View>

      {/* Mode & filter info */}
      <View style={styles.infoRow}>
        <View style={[styles.badge, { backgroundColor: modeConfig.color }]}>
          <Text style={styles.badgeText}>
            {modeConfig.icon} {modeConfig.label}
          </Text>
        </View>
        <View style={styles.filterBadge}>
          <Text style={styles.filterText}>{filterLabel}</Text>
        </View>
      </View>

      {/* Per-word results */}
      <Text style={styles.sectionTitle}>問題ごとの結果</Text>
      {result.perWordResults.map((r, i) => (
        <View
          key={i}
          style={[
            styles.wordResult,
            r.isCorrect ? styles.wordResultCorrect : styles.wordResultIncorrect,
          ]}
        >
          <Text style={styles.resultMark}>{r.isCorrect ? '✓' : '✗'}</Text>
          <View style={styles.resultInfo}>
            <Text style={styles.resultPrompt} numberOfLines={1}>{r.prompt}</Text>
            {!r.isCorrect && (
              <View style={styles.answerRow}>
                <Text style={styles.wrongAnswer}>{r.userAnswer || '(未回答)'}</Text>
                <Text style={styles.arrow}> → </Text>
                <Text style={styles.correctAnswer}>{r.correctAnswer}</Text>
              </View>
            )}
          </View>
        </View>
      ))}

      {/* Actions */}
      <View style={styles.actions}>
        {result.filter.type === 'date_range' && (
          <Button
            label="この範囲をもう一度"
            variant="secondary"
            onPress={handleRetryWithSameFilter}
          />
        )}
        <Button label="学習ホームへ戻る" onPress={handleRetry} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xl },
  scoreCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scoreEmoji: { fontSize: 48 },
  accuracyText: {
    fontSize: 52,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  scoreDetail: {
    fontSize: FontSize.lg,
    color: Colors.text,
    fontWeight: FontWeight.medium,
  },
  timeText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  infoRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    color: Colors.textOnPrimary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  filterBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  wordResult: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  wordResultCorrect: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success,
  },
  wordResultIncorrect: {
    backgroundColor: Colors.errorLight,
    borderColor: Colors.error,
  },
  resultMark: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, width: 20 },
  resultInfo: { flex: 1, gap: 2 },
  resultPrompt: { fontSize: FontSize.sm, color: Colors.text },
  answerRow: { flexDirection: 'row', alignItems: 'center' },
  wrongAnswer: {
    fontSize: FontSize.sm,
    color: Colors.error,
    textDecorationLine: 'line-through',
  },
  arrow: { fontSize: FontSize.sm, color: Colors.textSecondary },
  correctAnswer: {
    fontSize: FontSize.sm,
    color: Colors.success,
    fontWeight: FontWeight.semibold,
  },
  actions: { gap: Spacing.sm, marginTop: Spacing.sm },
  errorText: {
    fontSize: FontSize.md,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});
