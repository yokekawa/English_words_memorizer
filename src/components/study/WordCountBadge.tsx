import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants';

interface WordCountBadgeProps {
  count: number;
  label?: string;
}

export default function WordCountBadge({
  count,
  label = '単語',
}: WordCountBadgeProps) {
  const hasWords = count > 0;

  return (
    <View style={[styles.container, hasWords ? styles.hasWords : styles.noWords]}>
      <Text style={[styles.count, hasWords ? styles.countHas : styles.countNo]}>
        {count}
      </Text>
      <Text style={[styles.label, hasWords ? styles.labelHas : styles.labelNo]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  hasWords: {
    backgroundColor: Colors.successLight,
  },
  noWords: {
    backgroundColor: Colors.errorLight,
  },
  count: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  countHas: {
    color: Colors.success,
  },
  countNo: {
    color: Colors.error,
  },
  label: {
    fontSize: FontSize.sm,
  },
  labelHas: {
    color: Colors.success,
  },
  labelNo: {
    color: Colors.error,
  },
});
