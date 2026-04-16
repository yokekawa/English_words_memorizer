import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const containerStyle = [
    styles.base,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    isDisabled ? styles.disabled : undefined,
    style,
  ] as ViewStyle[];

  const textStyle: TextStyle[] = [
    styles.label,
    styles[`label_${variant}`],
    styles[`labelSize_${size}`],
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? Colors.textOnPrimary : Colors.primary}
          size="small"
        />
      ) : (
        <Text style={textStyle}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  variant_primary: {
    backgroundColor: Colors.primary,
  },
  variant_secondary: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  variant_danger: {
    backgroundColor: Colors.error,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
  },
  size_sm: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    minHeight: 36,
  },
  size_md: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    minHeight: 48,
  },
  size_lg: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    minHeight: 56,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    fontWeight: FontWeight.semibold,
  },
  label_primary: {
    color: Colors.textOnPrimary,
  },
  label_secondary: {
    color: Colors.text,
  },
  label_danger: {
    color: Colors.textOnPrimary,
  },
  label_ghost: {
    color: Colors.primary,
  },
  labelSize_sm: {
    fontSize: FontSize.sm,
  },
  labelSize_md: {
    fontSize: FontSize.md,
  },
  labelSize_lg: {
    fontSize: FontSize.lg,
  },
});
