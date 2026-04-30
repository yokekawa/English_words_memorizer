import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Word } from '@/types';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants';

interface WordCardProps {
  word: Word;
  onPress?: () => void;
  compact?: boolean;
}

export default function WordCard({ word, onPress, compact = false }: WordCardProps) {
  const content = (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.header}>
        <Text style={styles.baseForm}>{word.baseForm}</Text>
        {word.partOfSpeech !== 'unknown' && (
          <View style={styles.posBadge}>
            <Text style={styles.posText}>{word.partOfSpeech}</Text>
          </View>
        )}
      </View>

      {word.phonetic && (
        <Text style={styles.phonetic}>{word.phonetic.text}</Text>
      )}

      <Text style={styles.meaning}>{word.japaneseMeaning}</Text>

      {!compact && word.exampleSentence && (
        <Text style={styles.example} numberOfLines={2}>
          {word.exampleSentence}
        </Text>
      )}

      {!compact && word.conjugations.length > 0 && (
        <View style={styles.conjugations}>
          {word.conjugations.slice(0, 4).map(c => (
            <View key={c.type} style={styles.conjBadge}>
              <Text style={styles.conjType}>{CONJ_LABELS[c.type] ?? c.type}</Text>
              <Text style={styles.conjForm}>{c.form}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const CONJ_LABELS: Record<string, string> = {
  past_tense: '過去形',
  past_participle: '過去分詞',
  present_participle: '現在分詞',
  third_person_singular: '三単現',
  plural: '複数形',
  comparative: '比較級',
  superlative: '最上級',
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  cardCompact: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  baseForm: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  posBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  posText: {
    fontSize: FontSize.xs,
    color: Colors.textOnPrimary,
    fontWeight: FontWeight.medium,
  },
  phonetic: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontFamily: 'NotoSans_400Regular',
  },
  meaning: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  example: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  conjugations: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  conjBadge: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    flexDirection: 'row',
    gap: 4,
  },
  conjType: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  conjForm: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
  },
});
