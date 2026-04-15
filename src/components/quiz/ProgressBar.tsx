import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, BorderRadius } from '@/constants';

interface ProgressBarProps {
  current: number;
  total: number;
  correctCount: number;
}

export default function ProgressBar({
  current,
  total,
  correctCount,
}: ProgressBarProps) {
  const progress = total > 0 ? current / total : 0;
  const accuracy = current > 0 ? correctCount / current : 0;

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${progress * 100}%` as `${number}%` },
            { backgroundColor: accuracy >= 0.7 ? Colors.success : Colors.primary },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  track: {
    height: 6,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
});
