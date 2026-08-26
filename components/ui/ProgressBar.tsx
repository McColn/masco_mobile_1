// components/ui/ProgressBar.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius } from '@/constants/theme';

interface ProgressBarProps {
  progress: number; // 0 to 1
  height?: number;
  style?: ViewStyle;
  variant?: 'gold' | 'teal' | 'success' | 'danger';
}

export default function ProgressBar({
  progress,
  height = 6,
  style,
  variant = 'teal',
}: ProgressBarProps) {
  const clampedProgress = Math.min(1, Math.max(0, progress));

  const gradients: Record<string, [string, string]> = {
    gold: [Colors.gold, Colors.goldLight],
    teal: [Colors.teal, Colors.tealDark],
    success: ['#22c55e', '#16a34a'],
    danger: ['#ef4444', '#dc2626'],
  };

  return (
    <View style={[styles.track, { height }, style]}>
      <LinearGradient
        colors={gradients[variant]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fill, { width: `${clampedProgress * 100}%` }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },
});
