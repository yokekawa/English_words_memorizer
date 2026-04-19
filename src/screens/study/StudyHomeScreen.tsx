import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  StudyStackParams,
  QuizMode,
  WordFilter,
  PartOfSpeech,
  SavedRange,
  Word,
} from '@/types';
import { QUIZ_MODE_GROUPS, getGroupKeyForMode } from '@/constants/quizModes';
import { quizGenerationService } from '@/services/quizGenerationService';
import { useQuizStore } from '@/store/quizStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useWordStore } from '@/store/wordStore';
import { getDatabase } from '@/database/db';
import { SavedRangeRepository } from '@/database/repositories/savedRangeRepository';
import WordCountBadge from '@/components/study/WordCountBadge';
import Button from '@/components/common/Button';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants';

type Props = NativeStackScreenProps<StudyStackParams, 'StudyHome'>;

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function resolveFilterToIds(filter: WordFilter, allWords: Word[]): number[] {
  if (filter.type === 'word_ids') return filter.ids;
  let list = allWords;
  if (filter.type === 'date_range') {
    const toEnd = filter.to + 'T23:59:59.999Z';
    list = list.filter(w => w.createdAt >= filter.from && w.createdAt <= toEnd);
  }
  if ('pos' in filter && filter.pos && filter.pos.length > 0) {
    const pos = filter.pos;
    list = list.filter(w => pos.includes(w.partOfSpeech));
  }
  return list.map(w => w.id);
}

export default function StudyHomeScreen({ navigation, route }: Props) {
  // ── 保存済み範囲 ──
  const [savedRanges, setSavedRanges] = useState<SavedRange[]>([]);
  const [selectedRangeId, setSelectedRangeId] = useState<number | null>(null);
  const [saveFormVisible, setSaveFormVisible] = useState(false);
  const [newRangeName, setNewRangeName] = useState('');

  // ── 出題範囲（単語選択 + フィルター状態の保持） ──
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [useDateFilter, setUseDateFilter] = useState(false);
  const [fromDate, setFromDate] = useState<Date>(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); d.setHours(0, 0, 0, 0); return d;
  });
  const [toDate, setToDate] = useState<Date>(() => {
    const d = new Date(); d.setHours(23, 59, 59, 999); return d;
  });
  const [posFilter, setPosFilter] = useState<PartOfSpeech[]>([]);

  // ── 問題モード ──
  const [selectedMode, setSelectedMode] = useState<QuizMode>('jp_to_en');

  // ── 出題可能数 ──
  const [wordCount, setWordCount] = useState(0);
  const [isCountLoading, setIsCountLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const startSession = useQuizStore(s => s.startSession);
  const defaultWordCount = useSettingsStore(s => s.defaultWordCount);
  const { words: allWords, loadWords } = useWordStore();
  const hasInitializedSelection = useRef(false);
  const isManualChange = useRef(false);

  // 初期ロード
  useEffect(() => {
    loadWords();
    (async () => {
      const db = await getDatabase();
      const repo = new SavedRangeRepository(db);
      setSavedRanges(await repo.findAll());
    })();
  }, []);

  // 初回: 全単語を選択状態に
  useEffect(() => {
    if (hasInitializedSelection.current) return;
    if (allWords.length === 0) return;
    setSelectedIds(new Set(allWords.map(w => w.id)));
    hasInitializedSelection.current = true;
  }, [allWords]);

  // WordSelectionScreen からの戻り値を反映
  useEffect(() => {
    const result = route.params?.result;
    if (!result) return;
    isManualChange.current = true;
    setSelectedIds(new Set(result.selectedIds));
    setUseDateFilter(result.useDateFilter);
    setFromDate(new Date(result.fromIso));
    setToDate(new Date(result.toIso));
    setPosFilter(result.posFilter);
    navigation.setParams({ result: undefined });
    setTimeout(() => { isManualChange.current = false; }, 50);
  }, [route.params?.result]);

  // 選択が手動変更されたら保存済み範囲の選択を解除
  useEffect(() => {
    if (isManualChange.current) return;
    setSelectedRangeId(null);
  }, [selectedIds]);

  // クイズ用フィルター（常に word_ids）
  const filter: WordFilter = useMemo(
    () => ({ type: 'word_ids', ids: [...selectedIds] }),
    [selectedIds]
  );

  // 出題可能数を更新
  useEffect(() => {
    let cancelled = false;
    setIsCountLoading(true);
    quizGenerationService.countAvailableWords(selectedMode, filter)
      .then(n => { if (!cancelled) { setWordCount(n); setIsCountLoading(false); } })
      .catch(() => { if (!cancelled) setIsCountLoading(false); });
    return () => { cancelled = true; };
  }, [selectedMode, filter]);

  // 保存済み範囲を読み込む
  const loadSavedRange = (range: SavedRange) => {
    isManualChange.current = true;
    setSelectedRangeId(range.id);
    const f = range.filter;
    const ids = resolveFilterToIds(f, allWords);
    setSelectedIds(new Set(ids));

    if (f.type === 'date_range') {
      setUseDateFilter(true);
      setFromDate(new Date(f.from));
      setToDate(new Date(f.to));
      setPosFilter(f.pos ?? []);
    } else if (f.type === 'word_ids') {
      // フィルタ状態はそのまま（ユーザーが再編集するときに最後の状態を維持）
    } else {
      setUseDateFilter(false);
      setPosFilter('pos' in f ? (f.pos ?? []) : []);
    }
    setTimeout(() => { isManualChange.current = false; }, 50);
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
    isManualChange.current = true;
    setSelectedRangeId(saved.id);
    setTimeout(() => { isManualChange.current = false; }, 50);
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

  const openWordSelection = () => {
    navigation.navigate('WordSelection', {
      initialSelectedIds: [...selectedIds],
      initialUseDateFilter: useDateFilter,
      initialFromIso: toIsoDate(fromDate),
      initialToIso: toIsoDate(toDate),
      initialPosFilter: posFilter,
    });
  };

  const selectionStatus = useMemo(() => {
    if (allWords.length === 0) return '登録単語がありません';
    if (selectedIds.size === allWords.length) return `全${allWords.length}語`;
    return `${selectedIds.size} / ${allWords.length} 語`;
  }, [selectedIds, allWords]);

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

        {/* 単語選択ボタン（メイン動線） */}
        <TouchableOpacity style={styles.selectMainBtn} onPress={openWordSelection} activeOpacity={0.8}>
          <View style={styles.selectMainLeft}>
            <Text style={styles.selectMainTitle}>単語を選ぶ</Text>
            <Text style={styles.selectMainSub}>{selectionStatus}</Text>
          </View>
          <Text style={styles.selectMainArrow}>›</Text>
        </TouchableOpacity>

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
          {QUIZ_MODE_GROUPS.map(group => {
            const isActiveGroup = getGroupKeyForMode(selectedMode) === group.key;
            return (
              <TouchableOpacity
                key={group.key}
                style={[
                  styles.modeCard,
                  isActiveGroup && {
                    borderColor: group.color,
                    backgroundColor: group.color + '18',
                  },
                ]}
                onPress={() => setSelectedMode(group.modes[0].mode)}
                activeOpacity={0.8}
              >
                <Text style={styles.modeIcon}>{group.icon}</Text>
                <Text style={[styles.modeLabel, isActiveGroup && { color: group.color }]}>
                  {group.label}
                </Text>
                <Text style={styles.modeDesc}>{group.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sub-option chips for the currently active group (only if >1 option) */}
        {(() => {
          const activeGroup = QUIZ_MODE_GROUPS.find(
            g => g.key === getGroupKeyForMode(selectedMode)
          );
          if (!activeGroup || activeGroup.modes.length <= 1) return null;
          return (
            <View style={styles.subOptions}>
              <Text style={styles.subLabel}>出題する形</Text>
              <View style={styles.subChipsRow}>
                {activeGroup.modes.map(opt => {
                  const active = selectedMode === opt.mode;
                  return (
                    <TouchableOpacity
                      key={opt.mode}
                      style={[
                        styles.subChip,
                        active && {
                          backgroundColor: activeGroup.color,
                          borderColor: activeGroup.color,
                        },
                      ]}
                      onPress={() => setSelectedMode(opt.mode)}
                    >
                      <Text style={[styles.subChipText, active && styles.subChipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })()}
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
  selectMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  selectMainLeft: { gap: 2 },
  selectMainTitle: { fontSize: FontSize.md, color: Colors.textOnPrimary, fontWeight: FontWeight.bold },
  selectMainSub: { fontSize: FontSize.sm, color: Colors.textOnPrimary, opacity: 0.9 },
  selectMainArrow: { fontSize: 24, color: Colors.textOnPrimary, fontWeight: FontWeight.bold },
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
  subOptions: { gap: 6 },
  subLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  subChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  subChip: {
    paddingHorizontal: Spacing.sm, paddingVertical: 5,
    borderRadius: BorderRadius.full, borderWidth: 1.5,
    borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  subChipText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  subChipTextActive: { color: Colors.textOnPrimary },
  noWordHint: { fontSize: FontSize.sm, color: Colors.error, textAlign: 'center' },
});
