// components/ui/Badge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Radius, Typography, Spacing } from '@/constants/theme';

interface BadgeProps {
  label: string;
  color?: string;
  size?: 'sm' | 'md';
}

export default function Badge({ label, color = '#22c55e', size = 'sm' }: BadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: color + '22', borderColor: color + '55' },
        size === 'md' && styles.badgeMd,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color },
          size === 'md' && styles.textMd,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeMd: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
  },
  text: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },
  textMd: {
    fontSize: Typography.sm,
  },
});
