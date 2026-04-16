import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StudyStackParams, QuizMode, WordFilter, PartOfSpeech, Word } from '@/types';
import { QUIZ_MODE_CONFIGS } from '@/constants/quizModes';
import { quizGenerationService } from '@/services/quizGenerationService';
import { useQuizStore } from '@/store/quizStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useWordStore } from '@/store/wordStore';
import DateRangePicker from '@/components/study/DateRangePicker';
import WordCountBadge from '@/components/study/WordCountBadge';
import WordSelectionModal from '@/components/study/WordSelectionModal';
import Button from '@/components/common/Button';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontSize,
  FontWeight,
} from '@/constants';

type Props = NativeStackScreenProps<StudyStackParams, 'StudyHome'>;

const POS_OPTIONS: { pos: PartOfSpeech; label: string; color: string }[] = [
  { pos: 'noun',         label: '名詞',   color: '#10b981' },
  { pos: 'verb',         label: '動詞',   color: '#3b82f6' },
  { pos: 'adjective',    label: '形容詞', color: '#8b5cf6' },
  { pos: 'adverb',       label: '副詞',   color: '#f59e0b' },
  { pos: 'pronoun',      label: '代名詞', color: '#ec4899' },
  { pos: 'preposition',  label: '前置詞', color: '#ef4444' },
  { pos: 'conjunction',  label: '接続詞', color: '#6366f1' },
  { pos: 'interjection', label: '感嘆詞', color: '#14b8a6' },
];

export default function StudyHomeScreen({ navigation }: Props) {
  const [selectedMode, setSelectedMode] = useState<QuizMode>('jp_to_en');
  const [posFilter, setPosFilter] = useState<PartOfSpeech[]>([]);
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
  // null = use date_range auto filter; Set = explicit user selection
  const [examCustomIds, setExamCustomIds] = useState<Set<number> | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [isCountLoading, setIsCountLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const startSession = useQuizStore(s => s.startSession);
  const defaultWordCount = useSettingsStore(s => s.defaultWordCount);
  const { words: allWords, loadWords } = useWordStore();

  // Ensure words are loaded
  useEffect(() => {
    loadWords();
  }, []);

  // Reset custom selection when exam mode is toggled off or dates change
  useEffect(() => {
    setExamCustomIds(null);
  }, [examMode, fromDate, toDate]);

  // Compute the active filter
  const filter: WordFilter = useMemo(() => {
    if (!examMode) {
      return posFilter.length > 0
        ? { type: 'all', pos: posFilter }
        : { type: 'all' };
    }
    if (examCustomIds !== null) {
      return { type: 'word_ids', ids: [...examCustomIds] };
    }
    const f: WordFilter = {
      type: 'date_range',
      from: fromDate.toISOString().slice(0, 10),
      to: toDate.toISOString().slice(0, 10),
    };
    return f;
  }, [examMode, posFilter, examCustomIds, fromDate, toDate]);

  // Recompute available word count
  useEffect(() => {
    let cancelled = false;
    setIsCountLoading(true);
    quizGenerationService
      .countAvailableWords(selectedMode, filter)
      .then(count => {
        if (!cancelled) { setWordCount(count); setIsCountLoading(false); }
      })
      .catch(() => { if (!cancelled) setIsCountLoading(false); });
    return () => { cancelled = true; };
  }, [selectedMode, filter]);

  // Words pre-checked in modal = those in the current date range
  const initialModalSelection = useMemo<Set<number>>(() => {
    if (!examMode) return new Set();
    const from = fromDate.toISOString().slice(0, 10);
    const to = toDate.toISOString().slice(0, 10);
    return new Set(
      allWords
        .filter(w => w.createdAt >= from && w.createdAt <= to + 'T23:59:59.999Z')
        .map(w => w.id)
    );
  }, [examMode, fromDate, toDate, allWords]);

  const handleStart = async () => {
    if (wordCount === 0) return;
    setIsStarting(true);
    await startSession(selectedMode, filter, defaultWordCount);
    const { session } = useQuizStore.getState();
    if (session) navigation.navigate('Quiz', { sessionId: session.id });
    setIsStarting(false);
  };

  const handleModalConfirm = (ids: Set<number>) => {
    setExamCustomIds(ids);
    setModalVisible(false);
  };

  const togglePosFilter = (pos: PartOfSpeech) => {
    setPosFilter(prev =>
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    );
  };

  // Only show POS options that exist in the word store
  const activePosOptions = POS_OPTIONS.filter(opt =>
    allWords.some(w => w.partOfSpeech === opt.pos)
  );

  const examSelectionLabel = examCustomIds !== null
    ? `${examCustomIds.size}語選択中（カスタム）`
    : `日付範囲から自動選択`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

      {/* POS filter (non-exam mode only) */}
      {!examMode && activePosOptions.length > 0 && (
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>品詞で絞り込み</Text>
          <View style={styles.chipsRow}>
            <TouchableOpacity
              style={[styles.chip, posFilter.length === 0 && styles.chipAllActive]}
              onPress={() => setPosFilter([])}
            >
              <Text style={[styles.chipText, posFilter.length === 0 && styles.chipTextActive]}>
                すべて
              </Text>
            </TouchableOpacity>
            {activePosOptions.map(({ pos, label, color }) => {
              const active = posFilter.includes(pos);
              return (
                <TouchableOpacity
                  key={pos}
                  style={[
                    styles.chip,
                    active && { backgroundColor: color, borderColor: color },
                  ]}
                  onPress={() => togglePosFilter(pos)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Exam mode */}
      <View style={styles.examSection}>
        <View style={styles.examHeader}>
          <View style={styles.examTitleRow}>
            <Text style={styles.examIcon}>📝</Text>
            <View>
              <Text style={styles.examTitle}>試験対策モード</Text>
              <Text style={styles.examSubtitle}>出題単語を期間・品詞で自由に選択</Text>
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
          <View style={styles.examBody}>
            <DateRangePicker
              fromDate={fromDate}
              toDate={toDate}
              onFromDateChange={setFromDate}
              onToDateChange={setToDate}
            />

            {/* Selection status + customize button */}
            <View style={styles.selectionRow}>
              <Text style={styles.selectionLabel}>{examSelectionLabel}</Text>
              <TouchableOpacity
                style={styles.selectBtn}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.selectBtnText}>単語を選ぶ ›</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Start section */}
      <View style={styles.startSection}>
        <View style={styles.countRow}>
          <Text style={styles.countLabel}>
            {examMode ? 'このモードで出題可能:' : '出題可能な単語数:'}
          </Text>
          {isCountLoading ? (
            <Text style={styles.countLoading}>取得中...</Text>
          ) : (
            <WordCountBadge count={wordCount} />
          )}
        </View>

        {wordCount === 0 && !isCountLoading && (
          <Text style={styles.noWordHint}>
            {examMode
              ? '条件に一致する単語がありません。'
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

      {/* Word selection modal */}
      <WordSelectionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onConfirm={handleModalConfirm}
        allWords={allWords}
        initialSelectedIds={initialModalSelection}
      />
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
  filterSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  filterTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipAllActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  chipTextActive: { color: Colors.textOnPrimary },
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
  examBody: { gap: Spacing.md },
  selectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  selectionLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  selectBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
  },
  selectBtnText: {
    fontSize: FontSize.sm,
    color: Colors.textOnPrimary,
    fontWeight: FontWeight.semibold,
  },
  startSection: { gap: Spacing.sm },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  countLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  countLoading: { fontSize: FontSize.sm, color: Colors.textTertiary },
  noWordHint: {
    fontSize: FontSize.sm,
    color: Colors.error,
    textAlign: 'center',
  },
});
