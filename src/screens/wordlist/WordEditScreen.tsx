import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Audio } from 'expo-av';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WordListStackParams, Word } from '@/types';
import WordCard from '@/components/word/WordCard';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useWordStore } from '@/store/wordStore';
import { getDatabase } from '@/database/db';
import { WordRepository } from '@/database/repositories/wordRepository';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants';

type Props = NativeStackScreenProps<WordListStackParams, 'WordEdit'>;

export default function WordEditScreen({ navigation, route }: Props) {
  const { wordId } = route.params;
  const deleteWord = useWordStore(s => s.deleteWord);
  const [word, setWord] = useState<Word | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  useEffect(() => {
    (async () => {
      const db = await getDatabase();
      const repo = new WordRepository(db);
      const found = await repo.findById(wordId);
      setWord(found);
      setIsLoading(false);
    })();
  }, [wordId]);

  const handleDelete = () => {
    Alert.alert(
      '単語を削除',
      `「${word?.baseForm}」を単語帳から削除しますか？この操作は取り消せません。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            await deleteWord(wordId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const playAudio = async () => {
    if (!word?.phonetic?.audioUrl || isPlayingAudio) return;
    setIsPlayingAudio(true);
    try {
      const { sound } = await Audio.Sound.createAsync({
        uri: word.phonetic.audioUrl,
      });
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          setIsPlayingAudio(false);
        }
      });
    } catch {
      setIsPlayingAudio(false);
    }
  };

  if (isLoading) return <LoadingSpinner message="読み込み中..." />;
  if (!word) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>単語が見つかりません</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <WordCard word={word} />

      {word.phonetic?.audioUrl && (
        <TouchableOpacity
          style={styles.audioButton}
          onPress={playAudio}
          disabled={isPlayingAudio}
        >
          <Text style={styles.audioButtonText}>
            {isPlayingAudio ? '🔊 再生中...' : '🔊 発音を聞く'}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>学習履歴</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{word.timesCorrect}</Text>
            <Text style={styles.statLabel}>正解</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: Colors.error }]}>
              {word.timesIncorrect}
            </Text>
            <Text style={styles.statLabel}>不正解</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {word.timesCorrect + word.timesIncorrect > 0
                ? `${Math.round(
                    (word.timesCorrect /
                      (word.timesCorrect + word.timesIncorrect)) *
                      100
                  )}%`
                : '-'}
            </Text>
            <Text style={styles.statLabel}>正解率</Text>
          </View>
        </View>
        {word.lastStudied && (
          <Text style={styles.lastStudied}>
            最後の学習: {new Date(word.lastStudied).toLocaleDateString('ja-JP')}
          </Text>
        )}
      </View>

      <Button
        label="この単語を削除"
        variant="danger"
        onPress={handleDelete}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xl },
  errorText: {
    fontSize: FontSize.md,
    color: Colors.error,
    textAlign: 'center',
    padding: Spacing.xl,
  },
  audioButton: {
    alignSelf: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: 24,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  audioButtonText: {
    fontSize: FontSize.md,
    color: Colors.primary,
    fontWeight: FontWeight.medium,
  },
  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  statsTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.success,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  lastStudied: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
});
