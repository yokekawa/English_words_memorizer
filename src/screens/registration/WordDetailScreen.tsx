import React, { useState } from 'react';
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
import { RegistrationStackParams } from '@/types';
import WordCard from '@/components/word/WordCard';
import Button from '@/components/common/Button';
import { wordRegistrationService } from '@/services/wordRegistrationService';
import { useWordStore } from '@/store/wordStore';
import { Colors, Spacing, FontSize, FontWeight } from '@/constants';

type Props = NativeStackScreenProps<RegistrationStackParams, 'WordDetail'>;

export default function WordDetailScreen({ navigation, route }: Props) {
  const { wordDraft } = route.params;
  const addWord = useWordStore(s => s.addWord);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await wordRegistrationService.registerWord(wordDraft);
      addWord(saved);
      Alert.alert('登録完了', `「${saved.baseForm}」を単語帳に追加しました。`, [
        { text: 'OK', onPress: () => navigation.popToTop() },
      ]);
    } catch {
      Alert.alert('エラー', '単語の登録に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  };

  const playAudio = async () => {
    const audioUrl = wordDraft.phonetic?.audioUrl;
    if (!audioUrl || isPlayingAudio) return;
    setIsPlayingAudio(true);
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
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

  // Build a preview word object (without DB id) for WordCard display
  const previewWord = {
    id: 0,
    ...wordDraft,
    timesCorrect: 0,
    timesIncorrect: 0,
    lastStudied: null,
    nextReview: null,
    createdAt: new Date().toISOString(),
    conjugations: wordDraft.conjugations.map((c, i) => ({
      ...c,
      id: i,
      wordId: 0,
    })),
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.label}>登録内容の確認</Text>

      <WordCard word={previewWord} />

      {wordDraft.phonetic?.audioUrl && (
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

      <View style={styles.actions}>
        <Button
          label="キャンセル"
          variant="secondary"
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
        />
        <Button
          label="単語帳に登録"
          onPress={handleSave}
          loading={isSaving}
          style={styles.saveButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  label: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
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
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
});
