import React, { useState, useMemo, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Word, PartOfSpeech } from '@/types';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants';

const POS_CONFIG: Partial<Record<PartOfSpeech, { label: string; color: string }>> = {
  noun:         { label: '名詞',   color: '#10b981' },
  verb:         { label: '動詞',   color: '#3b82f6' },
  adjective:    { label: '形容詞', color: '#8b5cf6' },
  adverb:       { label: '副詞',   color: '#f59e0b' },
  pronoun:      { label: '代名詞', color: '#ec4899' },
  preposition:  { label: '前置詞', color: '#ef4444' },
  conjunction:  { label: '接続詞', color: '#6366f1' },
  interjection: { label: '感嘆詞', color: '#14b8a6' },
  unknown:      { label: 'その他', color: '#94a3b8' },
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: Set<number>) => void;
  allWords: Word[];
  initialSelectedIds: Set<number>;
}

function formatDate(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, '/');
}

export default function WordSelectionModal({
  visible,
  onClose,
  onConfirm,
  allWords,
  initialSelectedIds,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [posChips, setPosChips] = useState<PartOfSpeech[]>([]);

  // Re-initialise local state each time the modal opens
  const handleShow = useCallback(() => {
    setSelectedIds(new Set(initialSelectedIds));
    setPosChips([]);
  }, [initialSelectedIds]);

  const availablePos = useMemo<PartOfSpeech[]>(() => {
    const set = new Set(allWords.map(w => w.partOfSpeech));
    return (Object.keys(POS_CONFIG) as PartOfSpeech[]).filter(p => set.has(p));
  }, [allWords]);

  const visibleWords = useMemo(
    () =>
      posChips.length === 0
        ? allWords
        : allWords.filter(w => posChips.includes(w.partOfSpeech)),
    [allWords, posChips]
  );

  const toggleWord = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      visibleWords.forEach(w => next.add(w.id));
      return next;
    });
  };

  const deselectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      visibleWords.forEach(w => next.delete(w.id));
      return next;
    });
  };

  const togglePosChip = (pos: PartOfSpeech) => {
    setPosChips(prev =>
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    );
  };

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
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </TouchableOpacity>
      );
    },
    [selectedIds]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onShow={handleShow}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>出題単語を選択</Text>
          <View style={styles.closeBtn} />
        </View>

        {/* POS filter chips */}
        <View style={styles.chipsRow}>
          {availablePos.map(pos => {
            const cfg = POS_CONFIG[pos]!;
            const active = posChips.includes(pos);
            return (
              <TouchableOpacity
                key={pos}
                style={[
                  styles.chip,
                  active && { backgroundColor: cfg.color, borderColor: cfg.color },
                ]}
                onPress={() => togglePosChip(pos)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {cfg.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bulk actions */}
        <View style={styles.bulkRow}>
          <Text style={styles.bulkCount}>{selectedIds.size}語選択中</Text>
          <TouchableOpacity style={styles.bulkBtn} onPress={selectAll}>
            <Text style={styles.bulkBtnText}>全選択</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bulkBtn} onPress={deselectAll}>
            <Text style={styles.bulkBtnText}>全解除</Text>
          </TouchableOpacity>
        </View>

        {/* Word list */}
        <FlatList
          data={visibleWords}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          extraData={selectedIds}
          style={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <Text style={styles.empty}>単語が見つかりません</Text>
          }
        />

        {/* Confirm button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.confirmBtn, selectedIds.size === 0 && styles.confirmBtnDisabled]}
            onPress={() => onConfirm(selectedIds)}
            disabled={selectedIds.size === 0}
          >
            <Text style={styles.confirmBtnText}>{selectedIds.size}語を確定</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: FontSize.lg, color: Colors.textSecondary },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full ?? 99,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
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
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  bulkBtnText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.medium },
  list: { flex: 1 },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 52 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    gap: Spacing.sm,
  },
  rowChecked: { backgroundColor: Colors.primary + '0a' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { color: Colors.textOnPrimary, fontSize: 13, fontWeight: FontWeight.bold },
  rowBody: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  baseForm: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text },
  posBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
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
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: { color: Colors.textOnPrimary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
});
