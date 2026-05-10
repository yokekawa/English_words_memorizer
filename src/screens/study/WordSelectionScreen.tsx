import React, { useState, useEffect, useMemo, useCallback, useLayoutEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Switch,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StudyStackParams, Word, PartOfSpeech } from '@/types';
import { useWordStore } from '@/store/wordStore';
import DateRangePicker from '@/components/study/DateRangePicker';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants';

type Props = NativeStackScreenProps<StudyStackParams, 'WordSelection'>;

const POS_CONFIG: Partial<Record<PartOfSpeech, { label: string; color: string }>> = {
  noun:         { label: '名詞',   color: '#10b981' },
  verb:         { label: '動詞',   color: '#3b82f6' },
  auxiliary:    { label: '助動詞', color: '#0ea5e9' },
  adjective:    { label: '形容詞', color: '#8b5cf6' },
  adverb:       { label: '副詞',   color: '#f59e0b' },
  pronoun:      { label: '代名詞', color: '#ec4899' },
  preposition:  { label: '前置詞', color: '#ef4444' },
  conjunction:  { label: '接続詞', color: '#6366f1' },
  interjection: { label: '感嘆詞', color: '#14b8a6' },
  determiner:   { label: '限定詞', color: '#a855f7' },
  unknown:      { label: 'その他', color: '#94a3b8' },
};

function formatDateShort(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, '/');
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function WordSelectionScreen({ route, navigation }: Props) {
  const {
    initialSelectedIds,
    initialUseDateFilter,
    initialFromIso,
    initialToIso,
    initialPosFilter,
  } = route.params;

  const { words: allWords, loadWords } = useWordStore();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(initialSelectedIds)
  );
  const [useDateFilter, setUseDateFilter] = useState<boolean>(initialUseDateFilter);
  const [fromDate, setFromDate] = useState<Date>(() => new Date(initialFromIso));
  const [toDate, setToDate] = useState<Date>(() => new Date(initialToIso));
  const [posFilter, setPosFilter] = useState<PartOfSpeech[]>(initialPosFilter);

  const skipAutoToggle = useRef(true);

  useEffect(() => {
    loadWords();
  }, []);

  const wordsMatchingFilter = useCallback(
    (words: Word[]): Word[] => {
      let list = words;
      if (useDateFilter) {
        const from = toIsoDate(fromDate);
        const toEnd = toIsoDate(toDate) + 'T23:59:59.999Z';
        list = list.filter(w => w.createdAt >= from && w.createdAt <= toEnd);
      }
      if (posFilter.length > 0) {
        list = list.filter(w => posFilter.includes(w.partOfSpeech));
      }
      return list;
    },
    [useDateFilter, fromDate, toDate, posFilter]
  );

  useEffect(() => {
    if (skipAutoToggle.current) {
      skipAutoToggle.current = false;
      return;
    }
    const matching = wordsMatchingFilter(allWords);
    setSelectedIds(new Set(matching.map(w => w.id)));
  }, [useDateFilter, fromDate, toDate, posFilter, allWords]);

  const availablePos = useMemo<PartOfSpeech[]>(() => {
    const set = new Set(allWords.map(w => w.partOfSpeech));
    return (Object.keys(POS_CONFIG) as PartOfSpeech[]).filter(p => set.has(p));
  }, [allWords]);

  const sortedWords = useMemo(
    () => [...allWords].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [allWords]
  );

  const toggleWord = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(allWords.map(w => w.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const togglePos = (pos: PartOfSpeech) => {
    setPosFilter(prev =>
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    );
  };

  const handleConfirm = useCallback(() => {
    navigation.navigate('StudyHome', {
      result: {
        selectedIds: [...selectedIds],
        useDateFilter,
        fromIso: toIsoDate(fromDate),
        toIso: toIsoDate(toDate),
        posFilter,
      },
    });
  }, [navigation, selectedIds, useDateFilter, fromDate, toDate, posFilter]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleConfirm} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>確定</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleConfirm]);

  const renderItem = useCallback(
    ({ item }: { item: Word }) => {
      const checked = selectedIds.has(item.id);
      const cfg = POS_CONFIG[item.partOfSpeech];
      return (
        <TouchableOpacity
          style={[styles.row, checked && styles.rowChecked]}
          onPress={() => toggleWord(item.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
            {checked && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={styles.rowBody}>
            <View style={styles.rowTop}>
              <Text style={styles.baseForm}>{item.baseForm}</Text>
              {cfg && (
                <View style={[styles.posBadge, { backgroundColor: cfg.color + '22' }]}>
                  <Text style={[styles.posText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              )}
            </View>
            <Text style={styles.jpMeaning} numberOfLines={1}>{item.japaneseMeaning}</Text>
          </View>
          <Text style={styles.dateText}>{formatDateShort(item.createdAt)}</Text>
        </TouchableOpacity>
      );
    },
    [selectedIds]
  );

  return (
    <View style={styles.container}>
      <View style={styles.filterPanel}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>📅 期間を指定</Text>
          <Switch
            value={useDateFilter}
            onValueChange={setUseDateFilter}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.surface}
          />
        </View>
        {useDateFilter && (
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
          />
        )}

        {availablePos.length > 0 && (
          <View style={styles.posSection}>
            <Text style={styles.fieldLabel}>品詞</Text>
            <View style={styles.chipsRow}>
              <TouchableOpacity
                style={[styles.chip, posFilter.length === 0 && styles.chipActive]}
                onPress={() => setPosFilter([])}
              >
                <Text style={[styles.chipText, posFilter.length === 0 && styles.chipTextActive]}>すべて</Text>
              </TouchableOpacity>
              {availablePos.map(pos => {
                const cfg = POS_CONFIG[pos]!;
                const active = posFilter.includes(pos);
                return (
                  <TouchableOpacity
                    key={pos}
                    style={[
                      styles.chip,
                      active && { backgroundColor: cfg.color, borderColor: cfg.color },
                    ]}
                    onPress={() => togglePos(pos)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {cfg.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>

      <View style={styles.bulkRow}>
        <Text style={styles.bulkCount}>{selectedIds.size} / {allWords.length} 語選択中</Text>
        <TouchableOpacity style={styles.bulkBtn} onPress={selectAll}>
          <Text style={styles.bulkBtnText}>全選択</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bulkBtn} onPress={deselectAll}>
          <Text style={styles.bulkBtnText}>全解除</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sortedWords}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        extraData={selectedIds}
        style={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<Text style={styles.empty}>単語が登録されていません</Text>}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmBtn, selectedIds.size === 0 && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={selectedIds.size === 0}
        >
          <Text style={styles.confirmBtnText}>{selectedIds.size}語を確定</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  headerBtnText: { color: Colors.textOnPrimary, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  filterPanel: {
    padding: Spacing.md,
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  switchLabel: { fontSize: FontSize.md, color: Colors.text, fontWeight: FontWeight.medium },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  posSection: { gap: 6 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.sm, paddingVertical: 5,
    borderRadius: BorderRadius.full ?? 99, borderWidth: 1.5,
    borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  chipTextActive: { color: Colors.textOnPrimary },
  bulkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  bulkCount: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary },
  bulkBtn: {
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.primary,
  },
  bulkBtnText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.medium },
  list: { flex: 1 },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 52 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface, gap: Spacing.sm,
  },
  rowChecked: { backgroundColor: Colors.primary + '0a' },
  checkbox: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 2,
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { color: Colors.textOnPrimary, fontSize: 13, fontWeight: FontWeight.bold },
  rowBody: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  baseForm: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text },
  posBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  posText: { fontSize: 10, fontWeight: FontWeight.bold },
  jpMeaning: { fontSize: FontSize.sm, color: Colors.textSecondary },
  dateText: { fontSize: FontSize.xs, color: Colors.textTertiary },
  empty: { textAlign: 'center', marginTop: Spacing.xl, color: Colors.textSecondary },
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  confirmBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md, alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: { color: Colors.textOnPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
});
