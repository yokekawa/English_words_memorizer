import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WordListStackParams, Word } from '@/types';
import WordCard from '@/components/word/WordCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useWordStore } from '@/store/wordStore';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants';

type Props = NativeStackScreenProps<WordListStackParams, 'WordList'>;

type SortMode = 'created' | 'alpha';
const LETTER_ALL = '全';

function firstLetter(word: Word): string {
  const c = word.baseForm.charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}

export default function WordListScreen({ navigation }: Props) {
  const { words, isLoading, loadWords } = useWordStore();
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('created');
  const [letterFilter, setLetterFilter] = useState<string>(LETTER_ALL);

  useEffect(() => {
    loadWords();
  }, []);

  // Letters present in the current set, sorted. "#" bucket holds non-A-Z words.
  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    words.forEach(w => set.add(firstLetter(w)));
    const letters = [...set].sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });
    return letters;
  }, [words]);

  // Counts per letter so users see which sections are dense vs empty.
  const countsByLetter = useMemo(() => {
    const m = new Map<string, number>();
    words.forEach(w => {
      const k = firstLetter(w);
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return m;
  }, [words]);

  const filteredAndSorted = useMemo(() => {
    let list = words;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        w =>
          w.baseForm.toLowerCase().includes(q) ||
          w.japaneseMeaning.toLowerCase().includes(q)
      );
    }
    if (letterFilter !== LETTER_ALL) {
      list = list.filter(w => firstLetter(w) === letterFilter);
    }
    if (sortMode === 'alpha') {
      list = [...list].sort((a, b) =>
        a.baseForm.toLowerCase().localeCompare(b.baseForm.toLowerCase())
      );
    }
    return list;
  }, [words, query, letterFilter, sortMode]);

  if (isLoading) return <LoadingSpinner message="単語を読み込み中..." />;

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="英語または日本語で検索..."
          placeholderTextColor={Colors.textTertiary}
          clearButtonMode="while-editing"
        />

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.manualEntryBtn}
            onPress={() => navigation.navigate('ManualEntry')}
            activeOpacity={0.8}
          >
            <Text style={styles.manualEntryBtnText}>＋ 手動で単語を追加</Text>
          </TouchableOpacity>

          <View style={styles.sortToggle}>
            {(['created', 'alpha'] as SortMode[]).map(mode => {
              const active = sortMode === mode;
              const label = mode === 'created' ? '登録順' : 'A→Z';
              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.sortBtn, active && styles.sortBtnActive]}
                  onPress={() => setSortMode(mode)}
                >
                  <Text
                    style={[
                      styles.sortBtnText,
                      active && styles.sortBtnTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {words.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.letterStrip}
          >
            {[LETTER_ALL, ...availableLetters].map(letter => {
              const active = letterFilter === letter;
              const count =
                letter === LETTER_ALL ? words.length : countsByLetter.get(letter) ?? 0;
              return (
                <TouchableOpacity
                  key={letter}
                  style={[styles.letterChip, active && styles.letterChipActive]}
                  onPress={() => setLetterFilter(letter)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.letterChipText,
                      active && styles.letterChipTextActive,
                    ]}
                  >
                    {letter}
                  </Text>
                  <Text
                    style={[
                      styles.letterChipCount,
                      active && styles.letterChipCountActive,
                    ]}
                  >
                    {count}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {filteredAndSorted.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📖</Text>
          <Text style={styles.emptyTitle}>
            {words.length === 0
              ? '単語がまだありません'
              : '該当する単語がありません'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {words.length === 0
              ? '登録タブからカメラで、または上の「手動で単語を追加」から登録できます'
              : '検索語やフィルタを変更してください'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredAndSorted}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <WordCard
              word={item}
              compact
              onPress={() =>
                navigation.navigate('WordEdit', { wordId: item.id })
              }
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerContainer: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  searchInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  manualEntryBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  manualEntryBtnText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  sortToggle: {
    flexDirection: 'row',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  sortBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    backgroundColor: Colors.surface,
  },
  sortBtnActive: { backgroundColor: Colors.primary },
  sortBtnText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
  },
  sortBtnTextActive: { color: Colors.textOnPrimary },
  letterStrip: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingVertical: 2,
  },
  letterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    minWidth: 32,
  },
  letterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  letterChipText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: FontWeight.bold,
  },
  letterChipTextActive: { color: Colors.textOnPrimary },
  letterChipCount: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: FontWeight.medium,
  },
  letterChipCountActive: { color: Colors.textOnPrimary, opacity: 0.85 },
  list: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  separator: { height: Spacing.sm },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontSize: FontSize.lg,
    color: Colors.text,
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
