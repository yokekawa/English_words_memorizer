import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RegistrationStackParams } from '@/types';
import SelectableWord from '@/components/ocr/SelectableWord';
import Button from '@/components/common/Button';
import { wordRegistrationService } from '@/services/wordRegistrationService';
import { useWordStore } from '@/store/wordStore';
import { Colors, Spacing, FontSize, FontWeight } from '@/constants';

type WordStatus = 'idle' | 'selected' | 'loading' | 'registered' | 'error';

type Props = NativeStackScreenProps<RegistrationStackParams, 'OCRReview'>;

function extractWords(text: string): string[] {
  const matches = text.match(/[a-zA-Z]+/g) ?? [];
  const unique = [...new Set(matches.map(w => w.toLowerCase()))];
  return unique.filter(w => w.length >= 2);
}

export default function OCRReviewScreen({ route }: Props) {
  const { imageUri, rawText } = route.params;
  const addWord = useWordStore(s => s.addWord);

  const words = useMemo(() => extractWords(rawText), [rawText]);
  const [wordStatuses, setWordStatuses] = useState<Record<string, WordStatus>>(
    () => Object.fromEntries(words.map(w => [w, 'idle']))
  );
  const [isRegistering, setIsRegistering] = useState(false);

  const setStatus = (word: string, status: WordStatus) => {
    setWordStatuses(prev => ({ ...prev, [word]: status }));
  };

  const selectedWords = Object.entries(wordStatuses)
    .filter(([, s]) => s === 'selected')
    .map(([w]) => w);

  const handleWordPress = (word: string) => {
    const current = wordStatuses[word];
    if (current === 'loading' || current === 'registered' || isRegistering) return;
    setStatus(word, current === 'selected' ? 'idle' : 'selected');
  };

  const handleBatchRegister = async () => {
    if (selectedWords.length === 0 || isRegistering) return;
    setIsRegistering(true);

    setWordStatuses(prev => {
      const next = { ...prev };
      selectedWords.forEach(w => { next[w] = 'loading'; });
      return next;
    });

    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (const word of selectedWords) {
      try {
        const alreadyRegistered = await wordRegistrationService.isAlreadyRegistered(word);
        if (alreadyRegistered) {
          setStatus(word, 'registered');
          skipCount++;
          continue;
        }
        const draft = await wordRegistrationService.buildDraft(word);
        const registered = await wordRegistrationService.registerWord(draft);
        addWord(registered);
        setStatus(word, 'registered');
        successCount++;
      } catch {
        setStatus(word, 'error');
        failCount++;
      }
    }

    setIsRegistering(false);

    const parts: string[] = [];
    if (successCount > 0) parts.push(`${successCount}語を登録`);
    if (skipCount > 0) parts.push(`${skipCount}語は登録済み`);
    if (failCount > 0) parts.push(`${failCount}語が失敗`);
    Alert.alert('完了', parts.join('、') + 'しました。');
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="contain"
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            単語をタップして選択 ({words.length}語)
          </Text>
          <Text style={styles.sectionHint}>
            複数選択して「登録」ボタンでまとめて登録できます
          </Text>

          <View style={styles.wordCloud}>
            {words.map(word => (
              <SelectableWord
                key={word}
                word={word}
                status={wordStatuses[word] ?? 'idle'}
                onPress={() => handleWordPress(word)}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {selectedWords.length > 0 && (
        <View style={styles.bottomBar}>
          <Button
            label={isRegistering ? '登録中...' : `選択した ${selectedWords.length} 語を登録`}
            onPress={handleBatchRegister}
            loading={isRegistering}
            disabled={isRegistering}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.xl,
  },
  image: {
    width: '100%',
    height: 220,
    backgroundColor: '#000',
  },
  section: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  sectionHint: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  wordCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.sm,
  },
  bottomBar: {
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
});
