import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WordListStackParams, Word } from '@/types';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useWordStore } from '@/store/wordStore';
import { getDatabase } from '@/database/db';
import { WordRepository } from '@/database/repositories/wordRepository';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants';

type Props = NativeStackScreenProps<WordListStackParams, 'WordEdit'>;

const POS_LABELS: Record<string, string> = {
  noun: '名詞', verb: '動詞', adjective: '形容詞', adverb: '副詞',
  pronoun: '代名詞', preposition: '前置詞', conjunction: '接続詞',
  interjection: '感嘆詞', unknown: '不明',
};

const CONJ_LABELS: Record<string, string> = {
  past_tense: '過去形', past_participle: '過去分詞', present_participle: '現在分詞',
  third_person_singular: '三人称単数', plural: '複数形',
  comparative: '比較級', superlative: '最上級',
};

export default function WordEditScreen({ navigation, route }: Props) {
  const { wordId } = route.params;
  const { deleteWord, updateWord } = useWordStore();
  const [word, setWord] = useState<Word | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const [editBaseForm, setEditBaseForm] = useState('');
  const [editJpMeaning, setEditJpMeaning] = useState('');

  useEffect(() => {
    (async () => {
      const db = await getDatabase();
      const repo = new WordRepository(db);
      const found = await repo.findById(wordId);
      setWord(found);
      if (found) {
        setEditBaseForm(found.baseForm);
        setEditJpMeaning(found.japaneseMeaning);
        navigation.setOptions({ title: found.baseForm });
      }
      setIsLoading(false);
    })();
  }, [wordId]);

  const isDirty =
    word !== null &&
    (editBaseForm.trim() !== word.baseForm || editJpMeaning.trim() !== word.japaneseMeaning);

  const handleSave = async () => {
    if (!word || !isDirty) return;
    const base = editBaseForm.trim();
    const jp = editJpMeaning.trim();
    if (!base || !jp) {
      Alert.alert('入力エラー', '英単語と和訳を入力してください。');
      return;
    }
    setIsSaving(true);
    await updateWord(word.id, { baseForm: base, japaneseMeaning: jp });
    setWord(prev => prev ? { ...prev, baseForm: base, japaneseMeaning: jp } : prev);
    navigation.setOptions({ title: base });
    setIsSaving(false);
  };

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
      const { sound } = await Audio.Sound.createAsync({ uri: word.phonetic.audioUrl });
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Edit form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>単語を編集</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>英単語</Text>
            <TextInput
              style={styles.input}
              value={editBaseForm}
              onChangeText={setEditBaseForm}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>和訳</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={editJpMeaning}
              onChangeText={setEditJpMeaning}
              multiline
              returnKeyType="done"
            />
          </View>

          <Button
            label="保存"
            onPress={handleSave}
            disabled={!isDirty}
            loading={isSaving}
          />
        </View>

        {/* Word info (read-only) */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.posLabel}>{POS_LABELS[word.partOfSpeech] ?? word.partOfSpeech}</Text>
            {word.phonetic?.text && (
              <Text style={styles.phonetic}>{word.phonetic.text}</Text>
            )}
            {word.phonetic?.audioUrl && (
              <TouchableOpacity onPress={playAudio} disabled={isPlayingAudio}>
                <Text style={styles.audioIcon}>{isPlayingAudio ? '🔊' : '▶'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {word.exampleSentence && (
            <Text style={styles.example}>例: {word.exampleSentence}</Text>
          )}

          {word.conjugations.length > 0 && (
            <View style={styles.conjugations}>
              {word.conjugations.map(c => (
                <View key={c.id} style={styles.conjRow}>
                  <Text style={styles.conjType}>{CONJ_LABELS[c.type] ?? c.type}</Text>
                  <Text style={styles.conjForm}>{c.form}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>学習履歴</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: Colors.success }]}>{word.timesCorrect}</Text>
              <Text style={styles.statLabel}>正解</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: Colors.error }]}>{word.timesIncorrect}</Text>
              <Text style={styles.statLabel}>不正解</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {word.timesCorrect + word.timesIncorrect > 0
                  ? `${Math.round((word.timesCorrect / (word.timesCorrect + word.timesIncorrect)) * 100)}%`
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

        <Button label="この単語を削除" variant="danger" onPress={handleDelete} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xl },
  errorText: {
    fontSize: FontSize.md, color: Colors.error,
    textAlign: 'center', padding: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  cardTitle: {
    fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text,
  },
  field: { gap: 4 },
  fieldLabel: {
    fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  posLabel: {
    fontSize: FontSize.xs, fontWeight: FontWeight.bold,
    color: Colors.textOnPrimary, backgroundColor: Colors.primary,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  phonetic: { fontSize: FontSize.sm, color: Colors.textSecondary, fontStyle: 'italic' },
  audioIcon: { fontSize: FontSize.md, color: Colors.primary },
  example: { fontSize: FontSize.sm, color: Colors.textSecondary, fontStyle: 'italic' },
  conjugations: { gap: 4 },
  conjRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 2,
  },
  conjType: { fontSize: FontSize.sm, color: Colors.textSecondary },
  conjForm: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  statDivider: { width: 1, height: 40, backgroundColor: Colors.border },
  lastStudied: { fontSize: FontSize.xs, color: Colors.textTertiary, textAlign: 'center' },
});
