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
import { WordListStackParams, Word, PartOfSpeech } from '@/types';
import Button from '@/components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useWordStore } from '@/store/wordStore';
import { getDatabase } from '@/database/db';
import { WordRepository } from '@/database/repositories/wordRepository';
import { ConjugationRepository } from '@/database/repositories/conjugationRepository';
import { generateConjugations } from '@/api/conjugation/inflectorsService';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants';

type Props = NativeStackScreenProps<WordListStackParams, 'WordEdit'>;

const POS_OPTIONS: { pos: PartOfSpeech; label: string }[] = [
  { pos: 'noun',         label: '名詞' },
  { pos: 'verb',         label: '動詞' },
  { pos: 'adjective',    label: '形容詞' },
  { pos: 'adverb',       label: '副詞' },
  { pos: 'pronoun',      label: '代名詞' },
  { pos: 'preposition',  label: '前置詞' },
  { pos: 'conjunction',  label: '接続詞' },
  { pos: 'interjection', label: '感嘆詞' },
  { pos: 'unknown',      label: 'その他' },
];

const CONJ_LABELS: Record<string, string> = {
  past_tense: '過去形', past_participle: '過去分詞', present_participle: '現在分詞',
  third_person_singular: '三単現', plural: '複数形',
  comparative: '比較級', superlative: '最上級',
};

export default function WordEditScreen({ navigation, route }: Props) {
  const { wordId } = route.params;
  const { deleteWord, refreshWord } = useWordStore();
  const [word, setWord] = useState<Word | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const [editBaseForm, setEditBaseForm] = useState('');
  const [editJpMeaning, setEditJpMeaning] = useState('');
  const [editPos, setEditPos] = useState<PartOfSpeech>('unknown');

  const loadWord = async () => {
    const db = await getDatabase();
    const repo = new WordRepository(db);
    const found = await repo.findById(wordId);
    setWord(found);
    if (found) {
      setEditBaseForm(found.baseForm);
      setEditJpMeaning(found.japaneseMeaning);
      setEditPos(found.partOfSpeech);
      navigation.setOptions({ title: found.baseForm });
    }
    setIsLoading(false);
  };

  useEffect(() => { loadWord(); }, [wordId]);

  const isDirty =
    word !== null && (
      editBaseForm.trim() !== word.baseForm ||
      editJpMeaning.trim() !== word.japaneseMeaning ||
      editPos !== word.partOfSpeech
    );

  const handleSave = async () => {
    if (!word || !isDirty) return;
    const base = editBaseForm.trim();
    const jp = editJpMeaning.trim();
    if (!base || !jp) {
      Alert.alert('入力エラー', '英単語と和訳を入力してください。');
      return;
    }
    setIsSaving(true);
    const db = await getDatabase();
    const wordRepo = new WordRepository(db);
    const conjRepo = new ConjugationRepository(db);

    await wordRepo.update(word.id, { baseForm: base, japaneseMeaning: jp, partOfSpeech: editPos });

    // Regenerate conjugations when POS or base form changed
    if (editPos !== word.partOfSpeech || base !== word.baseForm) {
      await conjRepo.deleteByWordId(word.id);
      const newConjs = generateConjugations(base, editPos);
      for (const c of newConjs) {
        await conjRepo.insert(word.id, c.type, c.form);
      }
    }

    await refreshWord(word.id);
    await loadWord();
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

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>品詞</Text>
            <View style={styles.posGrid}>
              {POS_OPTIONS.map(({ pos, label }) => (
                <TouchableOpacity
                  key={pos}
                  style={[styles.posChip, editPos === pos && styles.posChipActive]}
                  onPress={() => setEditPos(pos)}
                >
                  <Text style={[styles.posChipText, editPos === pos && styles.posChipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {editPos !== word.partOfSpeech && (
              <Text style={styles.posHint}>
                ※ 品詞を変更すると活用形が自動で再生成されます
              </Text>
            )}
          </View>

          <Button
            label="保存"
            onPress={handleSave}
            disabled={!isDirty}
            loading={isSaving}
          />
        </View>

        {/* Conjugations & audio */}
        {(word.conjugations.length > 0 || word.phonetic) && (
          <View style={styles.card}>
            {word.phonetic && (
              <View style={styles.infoRow}>
                {word.phonetic.text && (
                  <Text style={styles.phonetic}>{word.phonetic.text}</Text>
                )}
                {word.phonetic.audioUrl && (
                  <TouchableOpacity onPress={playAudio} disabled={isPlayingAudio} style={styles.audioBtn}>
                    <Text style={styles.audioBtnText}>
                      {isPlayingAudio ? '🔊 再生中' : '🔊 発音を聞く'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {word.exampleSentence && (
              <Text style={styles.example}>例: {word.exampleSentence}</Text>
            )}
            {word.conjugations.length > 0 && (
              <View style={styles.conjugations}>
                <Text style={styles.fieldLabel}>活用形</Text>
                {word.conjugations.map(c => (
                  <View key={c.id} style={styles.conjRow}>
                    <Text style={styles.conjType}>{CONJ_LABELS[c.type] ?? c.type}</Text>
                    <Text style={styles.conjForm}>{c.form}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

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
  cardTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text },
  field: { gap: 4 },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm,
    fontSize: FontSize.md, color: Colors.text, backgroundColor: Colors.background,
  },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  posGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: 4 },
  posChip: {
    paddingHorizontal: Spacing.sm, paddingVertical: 5,
    borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  posChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  posChipText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  posChipTextActive: { color: Colors.textOnPrimary },
  posHint: { fontSize: FontSize.xs, color: Colors.warning, marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  phonetic: { fontSize: FontSize.sm, color: Colors.textSecondary, fontStyle: 'italic' },
  audioBtn: {
    paddingVertical: 4, paddingHorizontal: Spacing.sm,
    borderRadius: 16, backgroundColor: Colors.surfaceSecondary, borderWidth: 1, borderColor: Colors.border,
  },
  audioBtnText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.medium },
  example: { fontSize: FontSize.sm, color: Colors.textSecondary, fontStyle: 'italic' },
  conjugations: { gap: 4 },
  conjRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  conjType: { fontSize: FontSize.sm, color: Colors.textSecondary },
  conjForm: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  statDivider: { width: 1, height: 40, backgroundColor: Colors.border },
  lastStudied: { fontSize: FontSize.xs, color: Colors.textTertiary, textAlign: 'center' },
});
