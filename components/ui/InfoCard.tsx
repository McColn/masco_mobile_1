// Simple key-value info card used in many screens
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';

interface Row { label: string; value: string; color?: string }
interface Props { title?: string; rows: Row[]; accent?: string }

export function InfoCard({ title, rows, accent }: Props) {
  return (
    <View style={[styles.card, accent && { borderLeftColor: accent, borderLeftWidth: 4 }]}>
      {title && <Text style={styles.title}>{title}</Text>}
      {rows.map((r, i) => (
        <View key={i} style={[styles.row, i < rows.length - 1 && styles.rowBorder]}>
          <Text style={styles.label}>{r.label}</Text>
          <Text style={[styles.value, r.color ? { color: r.color } : null]}>{r.value || '—'}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.base, margin: Spacing.base, marginTop: 0, ...Shadow.sm },
  title: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.primary, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  label: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, flex: 1 },
  value: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.text, flex: 1, textAlign: 'right' },
});
