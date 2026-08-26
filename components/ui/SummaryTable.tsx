// Reusable table-style summary for report data
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { formatTZS } from '@/lib/format';

interface Column { key: string; label: string; type?: 'text' | 'currency' | 'number'; align?: 'left' | 'right' | 'center' }
interface Props { columns: Column[]; rows: Record<string, any>[]; title?: string; footer?: Record<string, any> }

export function SummaryTable({ columns, rows, title, footer }: Props) {
  const fmt = (val: any, type?: string) => {
    if (val === null || val === undefined) return '—';
    if (type === 'currency') return formatTZS(Number(val));
    if (type === 'number') return String(val);
    return String(val);
  };

  return (
    <View style={styles.card}>
      {title && <Text style={styles.title}>{title}</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Header */}
          <View style={styles.headerRow}>
            {columns.map(c => (
              <Text key={c.key} style={[styles.headerCell, { textAlign: c.align ?? 'left', minWidth: c.type === 'currency' ? 120 : 100 }]}>
                {c.label}
              </Text>
            ))}
          </View>
          {/* Rows */}
          {rows.map((row, i) => (
            <View key={i} style={[styles.row, i % 2 === 1 && styles.rowAlt]}>
              {columns.map(c => (
                <Text key={c.key} style={[styles.cell, { textAlign: c.align ?? 'left', minWidth: c.type === 'currency' ? 120 : 100 }]}>
                  {fmt(row[c.key], c.type)}
                </Text>
              ))}
            </View>
          ))}
          {/* Footer totals */}
          {footer && (
            <View style={styles.footerRow}>
              {columns.map(c => (
                <Text key={c.key} style={[styles.footerCell, { textAlign: c.align ?? 'left', minWidth: c.type === 'currency' ? 120 : 100 }]}>
                  {footer[c.key] !== undefined ? fmt(footer[c.key], c.type) : ''}
                </Text>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      {rows.length === 0 && <Text style={styles.empty}>No data found.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, margin: Spacing.base, marginTop: 0, ...Shadow.sm, overflow: 'hidden' },
  title: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.primary, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerRow: { flexDirection: 'row', backgroundColor: Colors.primary + '10', paddingVertical: 10, paddingHorizontal: 12 },
  headerCell: { fontSize: 11, fontWeight: Typography.weights.bold, color: Colors.primary, paddingHorizontal: 6 },
  row: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowAlt: { backgroundColor: Colors.surfaceAlt },
  cell: { fontSize: Typography.sizes.xs, color: Colors.text, paddingHorizontal: 6 },
  footerRow: { flexDirection: 'row', backgroundColor: Colors.primary + '15', paddingVertical: 10, paddingHorizontal: 12 },
  footerCell: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.bold, color: Colors.primary, paddingHorizontal: 6 },
  empty: { textAlign: 'center', color: Colors.textMuted, padding: Spacing.xl, fontSize: Typography.sizes.sm },
});
