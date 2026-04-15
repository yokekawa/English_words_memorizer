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
import { wordRegistrationService } from '@/services/wordRegistrationService';
import { useWordStore } from '@/store/wordStore';
import { Colors, Spacing, FontSize, FontWeight } from '@/constants';

type WordStatus = 'idle' | 'selected' | 'loading' | 'registered' | 'error';

type Props = NativeStackScreenProps<RegistrationStackParams, 'OCRReview'>;

// Extract unique English words from OCR text
function extractWords(text: string): string[] {
  const matches = text.match(/[a-zA-Z]+/g) ?? [];
  const unique = [...new Set(matches.map(w => w.toLowerCase()))];
  return unique.filter(w => w.length >= 2);
}

export default function OCRReviewScreen({ navigation, route }: Props) {
  const { imageUri, rawText } = route.params;
  const addWord = useWordStore(s => s.addWord);

  const words = useMemo(() => extractWords(rawText), [rawText]);
  const [wordStatuses, setWordStatuses] = useState<Record<string, WordStatus>>(
    () => Object.fromEntries(words.map(w => [w, 'idle']))
  );

  const setStatus = (word: string, status: WordStatus) => {
    setWordStatuses(prev => ({ ...prev, [word]: status }));
  };

  const handleWordPress = async (word: string) => {
    const current = wordStatuses[word];
    if (current === 'loading' || current === 'registered') return;

    if (current === 'selected') {
      // Deselect
      setStatus(word, 'idle');
      return;
    }

    setStatus(word, 'loading');
    try {
      const alreadyRegistered = await wordRegistrationService.isAlreadyRegistered(word);
      if (alreadyRegistered) {
        Alert.alert('登録済み', `「${word}」はすでに単語帳に登録されています。`);
        setStatus(word, 'registered');
        return;
      }

      const draft = await wordRegistrationService.buildDraft(word);
      navigation.navigate('WordDetail', { wordDraft: draft });
      setStatus(word, 'idle');
    } catch {
      setStatus(word, 'error');
      Alert.alert('エラー', `「${word}」の情報取得に失敗しました。`);
    }
  };

  return (
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
          単語をタップして登録 ({words.length}語)
        </Text>
        <Text style={styles.sectionHint}>
          タップすると発音・日本語・活用形を自動取得して登録画面に進みます
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
});
