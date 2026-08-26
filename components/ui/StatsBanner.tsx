// Top stats banner — shown on list screens  
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';

interface Stat { label: string; value: string; color?: string }
interface Props { stats: Stat[] }

export function StatsBanner({ stats }: Props) {
  return (
    <View style={styles.container}>
      {stats.map((s, i) => (
        <View key={i} style={[styles.stat, i < stats.length - 1 && styles.statBorder]}>
          <Text style={[styles.value, s.color ? { color: s.color } : null]}>{s.value}</Text>
          <Text style={styles.label}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    marginHorizontal: Spacing.base, marginBottom: Spacing.sm,
    borderRadius: Radius.lg, ...Shadow.sm, overflow: 'hidden',
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statBorder: { borderRightWidth: 1, borderRightColor: Colors.border },
  value: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.primary },
  label: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 2 },
});
