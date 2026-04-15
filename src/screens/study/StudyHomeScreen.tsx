import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StudyStackParams, QuizMode, WordFilter } from '@/types';
import { QUIZ_MODE_CONFIGS } from '@/constants/quizModes';
import { quizGenerationService } from '@/services/quizGenerationService';
import { useQuizStore } from '@/store/quizStore';
import { useSettingsStore } from '@/store/settingsStore';
import DateRangePicker from '@/components/study/DateRangePicker';
import WordCountBadge from '@/components/study/WordCountBadge';
import Button from '@/components/common/Button';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
} from '@/constants';

type Props = NativeStackScreenProps<StudyStackParams, 'StudyHome'>;

export default function StudyHomeScreen({ navigation }: Props) {
  const [selectedMode, setSelectedMode] = useState<QuizMode>('jp_to_en');
  const [examMode, setExamMode] = useState(false);
  const [fromDate, setFromDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [toDate, setToDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  });
  const [wordCount, setWordCount] = useState(0);
  const [isCountLoading, setIsCountLoading] = useState(false);

  const startSession = useQuizStore(s => s.startSession);
  const defaultWordCount = useSettingsStore(s => s.defaultWordCount);
  const [isStarting, setIsStarting] = useState(false);

  const filter: WordFilter = examMode
    ? {
        type: 'date_range',
        from: fromDate.toISOString().slice(0, 10),
        to: toDate.toISOString().slice(0, 10),
      }
    : { type: 'all' };

  useEffect(() => {
    let cancelled = false;
    setIsCountLoading(true);
    quizGenerationService
      .countAvailableWords(selectedMode, filter)
      .then(count => {
        if (!cancelled) {
          setWordCount(count);
          setIsCountLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsCountLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedMode, examMode, fromDate, toDate]);

  const handleStart = async () => {
    if (wordCount === 0) return;
    setIsStarting(true);
    await startSession(selectedMode, filter, defaultWordCount);
    const { session } = useQuizStore.getState();
    if (session) {
      navigation.navigate('Quiz', { sessionId: session.id });
    }
    setIsStarting(false);
  };

  const formatDate = (d: Date) =>
    `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(
      d.getDate()
    ).padStart(2, '0')}`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Mode selection */}
      <Text style={styles.sectionTitle}>学習モードを選択</Text>
      <View style={styles.modeGrid}>
        {QUIZ_MODE_CONFIGS.map(config => (
          <TouchableOpacity
            key={config.mode}
            style={[
              styles.modeCard,
              selectedMode === config.mode && {
                borderColor: config.color,
                backgroundColor: config.color + '18',
              },
            ]}
            onPress={() => setSelectedMode(config.mode)}
            activeOpacity={0.8}
          >
            <Text style={styles.modeIcon}>{config.icon}</Text>
            <Text
              style={[
                styles.modeLabel,
                selectedMode === config.mode && { color: config.color },
              ]}
            >
              {config.label}
            </Text>
            <Text style={styles.modeDesc}>{config.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Exam mode */}
      <View style={styles.examSection}>
        <View style={styles.examHeader}>
          <View style={styles.examTitleRow}>
            <Text style={styles.examIcon}>📝</Text>
            <View>
              <Text style={styles.examTitle}>試験対策モード</Text>
              <Text style={styles.examSubtitle}>
                登録した期間で出題範囲を絞り込む
              </Text>
            </View>
          </View>
          <Switch
            value={examMode}
            onValueChange={setExamMode}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.surface}
          />
        </View>

        {examMode && (
          <View style={styles.dateSection}>
            <DateRangePicker
              fromDate={fromDate}
              toDate={toDate}
              onFromDateChange={setFromDate}
              onToDateChange={setToDate}
            />
            <View style={styles.countRow}>
              <Text style={styles.countLabel}>
                {formatDate(fromDate)} 〜 {formatDate(toDate)} に登録した単語:
              </Text>
              {isCountLoading ? (
                <Text style={styles.countLoading}>取得中...</Text>
              ) : (
                <WordCountBadge count={wordCount} />
              )}
            </View>
          </View>
        )}
      </View>

      {/* Start button */}
      <View style={styles.startSection}>
        {!examMode && (
          <View style={styles.countRow}>
            <Text style={styles.countLabel}>出題可能な単語数:</Text>
            {isCountLoading ? (
              <Text style={styles.countLoading}>取得中...</Text>
            ) : (
              <WordCountBadge count={wordCount} />
            )}
          </View>
        )}

        {wordCount === 0 && !isCountLoading && (
          <Text style={styles.noWordHint}>
            {examMode
              ? 'この期間に登録した単語がありません。'
              : '単語を登録してから学習を始めましょう。'}
          </Text>
        )}

        <Button
          label={`学習開始（最大${defaultWordCount}問）`}
          onPress={handleStart}
          disabled={wordCount === 0 || isCountLoading}
          loading={isStarting}
          size="lg"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.lg, paddingBottom: Spacing.xl },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  modeCard: {
    width: '47%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: Spacing.xs,
  },
  modeIcon: { fontSize: 24 },
  modeLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  modeDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  examSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  examHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  examTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  examIcon: { fontSize: 24 },
  examTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  examSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  dateSection: { gap: Spacing.md },
  startSection: { gap: Spacing.sm },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  countLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  countLoading: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  noWordHint: {
    fontSize: FontSize.sm,
    color: Colors.error,
    textAlign: 'center',
  },
});
