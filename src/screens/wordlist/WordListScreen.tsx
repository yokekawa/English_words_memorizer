import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  TextInput,
  StyleSheet,
  Text,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WordListStackParams } from '@/types';
import WordCard from '@/components/word/WordCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useWordStore } from '@/store/wordStore';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants';

type Props = NativeStackScreenProps<WordListStackParams, 'WordList'>;

export default function WordListScreen({ navigation }: Props) {
  const { words, isLoading, loadWords } = useWordStore();
  const [query, setQuery] = useState('');

  useEffect(() => {
    loadWords();
  }, []);

  const filtered = query.trim()
    ? words.filter(
        w =>
          w.baseForm.toLowerCase().includes(query.toLowerCase()) ||
          w.japaneseMeaning.includes(query)
      )
    : words;

  if (isLoading) return <LoadingSpinner message="単語を読み込み中..." />;

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="英語または日本語で検索..."
          placeholderTextColor={Colors.textTertiary}
          clearButtonMode="while-editing"
        />
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📖</Text>
          <Text style={styles.emptyTitle}>
            {query ? '該当する単語がありません' : '単語がまだありません'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {query
              ? '別のキーワードで検索してください'
              : '登録タブからカメラで単語を追加してください'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
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
  searchContainer: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
  },
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
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
