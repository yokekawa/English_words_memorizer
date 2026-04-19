import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import { QuizMode } from '@/types';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants';
import { getQuizModeConfig } from '@/constants/quizModes';

interface QuizQuestionProps {
  prompt: string;
  mode: QuizMode;
  questionNumber: number;
  totalQuestions: number;
  audioUrl?: string;
}

export default function QuizQuestion({
  prompt,
  mode,
  questionNumber,
  totalQuestions,
  audioUrl,
}: QuizQuestionProps) {
  const config = getQuizModeConfig(mode);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!audioUrl) return;
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      try {
        const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
        if (cancelled) {
          await sound.unloadAsync().catch(() => {});
          return;
        }
        soundRef.current = sound;
        await sound.playAsync();
      } catch {
        // Audio unavailable — silently skip
      }
    })();
    return () => {
      cancelled = true;
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, [audioUrl]);

  const replayAudio = async () => {
    if (!soundRef.current) return;
    try {
      await soundRef.current.setPositionAsync(0);
      await soundRef.current.playAsync();
    } catch {
      // ignore
    }
  };

  const isAudio = mode === 'audio_to_en';

  return (
    <View style={styles.container}>
      <View style={[styles.modeBadge, { backgroundColor: config.color }]}>
        <Text style={styles.modeIcon}>{config.icon}</Text>
        <Text style={styles.modeLabel}>{config.label}</Text>
      </View>

      <Text style={styles.counter}>
        {questionNumber} / {totalQuestions}
      </Text>

      <View style={styles.promptBox}>
        <Text style={styles.promptLabel}>問題</Text>
        {isAudio && audioUrl && (
          <TouchableOpacity style={styles.playButton} onPress={replayAudio} activeOpacity={0.7}>
            <Text style={styles.playIcon}>▶</Text>
            <Text style={styles.playLabel}>もう一度再生</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.prompt}>{prompt}</Text>
      </View>

      <Text style={styles.instruction}>英語でスペルを入力してください</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  modeIcon: {
    fontSize: FontSize.md,
  },
  modeLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textOnPrimary,
  },
  counter: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  promptBox: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    minHeight: 120,
    justifyContent: 'center',
  },
  promptLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  prompt: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  playIcon: { color: Colors.textOnPrimary, fontSize: FontSize.md },
  playLabel: {
    color: Colors.textOnPrimary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  instruction: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
});
