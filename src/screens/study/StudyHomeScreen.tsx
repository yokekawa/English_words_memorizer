import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StudyStackParams, QuizMode, WordFilter, PartOfSpeech, SavedRange } from '@/types';
import { QUIZ_MODE_CONFIGS } from '@/constants/quizModes';
import { quizGenerationService } from '@/services/quizGenerationService';
import { useQuizStore } from '@/store/quizStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useWordStore } from '@/store/wordStore';
import { getDatabase } from '@/database/db';
import { SavedRangeRepository } from '@/database/repositories/savedRangeRepository';
import DateRangePicker from '@/components/study/DateRangePicker';
import WordCountBadge from '@/components/study/WordCountBadge';
import WordSelectionModal from '@/components/study/WordSelectionModal';
import Button from '@/components/common/Button';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants';

type Props = NativeStackScreenProps<StudyStackParams, 'StudyHome'>;

const POS_OPTIONS: { pos: PartOfSpeech; label: string }[] = [
  { pos: 'noun',         label: '名詞' },
  { pos: 'verb',         label: '動詞' },
  { pos: 'adjective',    label: '形容詞' },
  { pos: 'adverb',       label: '副詞' },
  { pos: 'pronoun',      label: '代名詞' },
  { pos: 'preposition',  label: '前置詞' },
  { pos: 'conjunction',  label: '接続詞' },
  { pos: 'interjection', label: '感嘆詞' },
];

export default function StudyHomeScreen({ navigation }: Props) {
  // ── 保存済み範囲 ──
  const [savedRanges, setSavedRanges] = useState<SavedRange[]>([]);
  const [selectedRangeId, setSelectedRangeId] = useState<number | null>(null);
  const [saveFormVisible, setSaveFormVisible] = useState(false);
  const [newRangeName, setNewRangeName] = useState('');

  // ── 出題範囲設定 ──
  const [useDateFilter, setUseDateFilter] = useState(false);
  const [fromDate, setFromDate] = useState<Date>(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); d.setHours(0, 0, 0, 0); return d;
  });
  const [toDate, setToDate] = useState<Date>(() => {
    const d = new Date(); d.setHours(23, 59, 59, 999); return d;
  });
  const [posFilter, setPosFilter] = useState<PartOfSpeech[]>([]);
  const [examCustomIds, setExamCustomIds] = useState<Set<number> | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // ── 問題モード ──
  const [selectedMode, setSelectedMode] = useState<QuizMode>('jp_to_en');

  // ── 出題可能数 ──
  const [wordCount, setWordCount] = useState(0);
  const [isCountLoading, setIsCountLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const startSession = useQuizStore(s => s.startSession);
  const defaultWordCount = useSettingsStore(s => s.defaultWordCount);
  const { words: allWords, loadWords } = useWordStore();
  const loadingRange = useRef(false);

  // 初期ロード
  useEffect(() => {
    loadWords();
    (async () => {
      const db = await getDatabase();
      const repo = new SavedRangeRepository(db);
      setSavedRanges(await repo.findAll());
    })();
  }, []);

  // 現在のフィルター
  const filter: WordFilter = useMemo(() => {
    if (examCustomIds !== null) return { type: 'word_ids', ids: [...examCustomIds] };
    if (useDateFilter) {
      const base = {
        type: 'date_range' as const,
        from: fromDate.toISOString().slice(0, 10),
        to: toDate.toISOString().slice(0, 10),
      };
      return posFilter.length > 0 ? { ...base, pos: posFilter } : base;
    }
    return posFilter.length > 0 ? { type: 'all' as const, pos: posFilter } : { type: 'all' as const };
  }, [examCustomIds, useDateFilter, fromDate, toDate, posFilter]);

  // 出題可能数を更新
  useEffect(() => {
    let cancelled = false;
    setIsCountLoading(true);
    quizGenerationService.countAvailableWords(selectedMode, filter)
      .then(n => { if (!cancelled) { setWordCount(n); setIsCountLoading(false); } })
      .catch(() => { if (!cancelled) setIsCountLoading(false); });
    return () => { cancelled = true; };
  }, [selectedMode, filter]);

  // 範囲設定が手動変更されたら選択解除
  useEffect(() => {
    if (loadingRange.current) return;
    setSelectedRangeId(null);
  }, [useDateFilter, fromDate, toDate, posFilter, examCustomIds]);

  // モーダルの初期選択（期間内の単語）
  const initialModalSelection = useMemo<Set<number>>(() => {
    if (!useDateFilter && examCustomIds === null) return new Set(allWords.map(w => w.id));
    if (examCustomIds !== null) return examCustomIds;
    const from = fromDate.toISOString().slice(0, 10);
    const to = toDate.toISOString().slice(0, 10);
    return new Set(allWords.filter(w => w.createdAt >= from && w.createdAt <= to + 'T23:59:59.999Z').map(w => w.id));
  }, [useDateFilter, examCustomIds, fromDate, toDate, allWords]);

  // 保存済み範囲を読み込む
  const loadSavedRange = (range: SavedRange) => {
    loadingRange.current = true;
    setSelectedRangeId(range.id);
    const f = range.filter;
    if (f.type === 'word_ids') {
      setExamCustomIds(new Set(f.ids));
      setUseDateFilter(false);
      setPosFilter([]);
    } else if (f.type === 'date_range') {
      setUseDateFilter(true);
      setFromDate(new Date(f.from));
      setToDate(new Date(f.to));
      setPosFilter(f.pos ?? []);
      setExamCustomIds(null);
    } else {
      setUseDateFilter(false);
      setPosFilter('pos' in f ? (f.pos ?? []) : []);
      setExamCustomIds(null);
    }
    setTimeout(() => { loadingRange.current = false; }, 50);
  };

  const handleDeleteRange = (range: SavedRange) => {
    Alert.alert('範囲を削除', `「${range.name}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive',
        onPress: async () => {
          const db = await getDatabase();
          await new SavedRangeRepository(db).delete(range.id);
          setSavedRanges(prev => prev.filter(r => r.id !== range.id));
          if (selectedRangeId === range.id) setSelectedRangeId(null);
        },
      },
    ]);
  };

  const handleSaveRange = async () => {
    const name = newRangeName.trim();
    if (!name) return;
    const db = await getDatabase();
    const saved = await new SavedRangeRepository(db).insert(name, filter);
    setSavedRanges(prev => [saved, ...prev]);
    loadingRange.current = true;
    setSelectedRangeId(saved.id);
    setTimeout(() => { loadingRange.current = false; }, 50);
    setSaveFormVisible(false);
    setNewRangeName('');
  };

  const handleStart = async () => {
    if (wordCount === 0) return;
    setIsStarting(true);
    await startSession(selectedMode, filter, defaultWordCount);
    const { session } = useQuizStore.getState();
    if (session) navigation.navigate('Quiz', { sessionId: session.id });
    setIsStarting(false);
  };

  const togglePosFilter = (pos: PartOfSpeech) => {
    setPosFilter(prev => prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]);
  };

  const activePosOptions = POS_OPTIONS.filter(opt => allWords.some(w => w.partOfSpeech === opt.pos));

  const selectionStatus = examCustomIds !== null
    ? `${examCustomIds.size}語（手動選択）`
    : useDateFilter
      ? '期間内の全単語'
      : '全登録単語';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── 出題範囲設定 ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 出題範囲設定</Text>

        {/* 保存済み範囲 */}
        {savedRanges.length > 0 && (
          <View style={styles.savedRow}>
            <Text style={styles.fieldLabel}>保存済み</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.savedScroll}>
              {savedRanges.map(range => (
                <TouchableOpacity
                  key={range.id}
                  style={[styles.savedChip, selectedRangeId === range.id && styles.savedChipActive]}
                  onPress={() => loadSavedRange(range)}
                  onLongPress={() => handleDeleteRange(range)}
                >
                  <Text style={[styles.savedChipText, selectedRangeId === range.id && styles.savedChipTextActive]}>
                    {range.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 期間指定 */}
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>📅 期間を指定</Text>
          <Switch
            value={useDateFilter}
            onValueChange={v => { setUseDateFilter(v); setExamCustomIds(null); }}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.surface}
          />
        </View>
        {useDateFilter && (
          <DateRangePicker
            fromDate={fromDate} toDate={toDate}
            onFromDateChange={setFromDate} onToDateChange={setToDate}
          />
        )}

        {/* 品詞フィルター */}
        {activePosOptions.length > 0 && (
          <View style={styles.posSection}>
            <Text style={styles.fieldLabel}>品詞で絞り込み</Text>
            <View style={styles.chipsRow}>
              <TouchableOpacity
                style={[styles.chip, posFilter.length === 0 && styles.chipActive]}
                onPress={() => setPosFilter([])}
              >
                <Text style={[styles.chipText, posFilter.length === 0 && styles.chipTextActive]}>すべて</Text>
              </TouchableOpacity>
              {activePosOptions.map(({ pos, label }) => {
                const active = posFilter.includes(pos);
                return (
                  <TouchableOpacity
                    key={pos}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => togglePosFilter(pos)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* 単語選択ボタン */}
        <View style={styles.selectRow}>
          <View>
            <Text style={styles.fieldLabel}>対象単語</Text>
            <Text style={styles.selectionStatus}>{selectionStatus}</Text>
          </View>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.selectBtnText}>単語を選ぶ ›</Text>
          </TouchableOpacity>
        </View>

        {/* 出題可能数 + 保存 */}
        <View style={styles.countAndSaveRow}>
          <View style={styles.countRow}>
            <Text style={styles.countLabel}>このモードで出題可能:</Text>
            {isCountLoading
              ? <Text style={styles.countLoading}>取得中...</Text>
              : <WordCountBadge count={wordCount} />}
          </View>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={() => { setSaveFormVisible(v => !v); setNewRangeName(''); }}
          >
            <Text style={styles.saveBtnText}>{saveFormVisible ? '✕' : '＋ 保存'}</Text>
          </TouchableOpacity>
        </View>

        {/* 保存フォーム */}
        {saveFormVisible && (
          <View style={styles.saveForm}>
            <TextInput
              style={styles.saveInput}
              placeholder="範囲の名前（例: Section 3, 中間試験範囲）"
              value={newRangeName}
              onChangeText={setNewRangeName}
              returnKeyType="done"
              onSubmitEditing={handleSaveRange}
              autoFocus
            />
            <Button label="保存する" onPress={handleSaveRange} disabled={!newRangeName.trim()} />
          </View>
        )}

        {savedRanges.length > 0 && (
          <Text style={styles.hintText}>保存済み範囲は長押しで削除できます</Text>
        )}
      </View>

      {/* ── 問題モード選択 ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 問題モードを選択</Text>
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
              <Text style={[styles.modeLabel, selectedMode === config.mode && { color: config.color }]}>
                {config.label}
              </Text>
              <Text style={styles.modeDesc}>{config.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── 学習開始 ── */}
      {wordCount === 0 && !isCountLoading && (
        <Text style={styles.noWordHint}>条件に一致する単語がありません。</Text>
      )}
      <Button
        label={`学習開始（最大${defaultWordCount}問）`}
        onPress={handleStart}
        disabled={wordCount === 0 || isCountLoading}
        loading={isStarting}
        size="lg"
      />

      {/* 単語選択モーダル */}
      <WordSelectionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onConfirm={ids => { setExamCustomIds(ids); setModalVisible(false); }}
        allWords={allWords}
        initialSelectedIds={initialModalSelection}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.lg, paddingBottom: Spacing.xl },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  savedRow: { gap: 4 },
  savedScroll: { marginTop: 4 },
  savedChip: {
    marginRight: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  savedChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  savedChipText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  savedChipTextActive: { color: Colors.textOnPrimary },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  switchLabel: { fontSize: FontSize.md, color: Colors.text, fontWeight: FontWeight.medium },
  posSection: { gap: 6 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.sm, paddingVertical: 5,
    borderRadius: BorderRadius.full, borderWidth: 1.5,
    borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  chipTextActive: { color: Colors.textOnPrimary },
  selectRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.md, padding: Spacing.sm,
  },
  selectionStatus: { fontSize: FontSize.sm, color: Colors.text, fontWeight: FontWeight.medium, marginTop: 2 },
  selectBtn: {
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    backgroundColor: Colors.primary, borderRadius: BorderRadius.sm,
  },
  selectBtnText: { fontSize: FontSize.sm, color: Colors.textOnPrimary, fontWeight: FontWeight.semibold },
  countAndSaveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  countLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  countLoading: { fontSize: FontSize.sm, color: Colors.textTertiary },
  saveBtn: {
    paddingHorizontal: Spacing.sm, paddingVertical: 5,
    borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.primary,
  },
  saveBtnText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },
  saveForm: { gap: Spacing.sm },
  saveInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm,
    fontSize: FontSize.md, color: Colors.text, backgroundColor: Colors.background,
  },
  hintText: { fontSize: FontSize.xs, color: Colors.textTertiary, textAlign: 'center' },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  modeCard: {
    width: '47%', padding: Spacing.md,
    borderRadius: BorderRadius.lg, borderWidth: 2,
    borderColor: Colors.border, backgroundColor: Colors.surface, gap: Spacing.xs,
  },
  modeIcon: { fontSize: 24 },
  modeLabel: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text },
  modeDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },
  noWordHint: { fontSize: FontSize.sm, color: Colors.error, textAlign: 'center' },
});
