import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { formatTZS, getTodayLocal } from '@/lib/format';
import api from '@/lib/api';

export default function HQTransferExpensesScreen() {
  const today = getTodayLocal();
  const [dateFrom, setDateFrom] = useState(today.slice(0, 7) + '-01');
  const [dateTo,   setDateTo]   = useState(today);
  const [search,   setSearch]   = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['hq-transfer-expenses', search],
    queryFn: () => api.get('/reports/bank-transfer-expenses/', {
      params: { date_from: search.from, date_to: search.to },
    }).then(r => r.data),
    enabled: !!search,
  });

  const branches: any[] = data?.branch_summary ?? [];
  const grandTotal       = data?.grand_total ?? 0;
  const activeCount      = branches.filter((b: any) => b.has_transfer).length;

  return (
    <ScreenLayout title="HQ Transfer Expenses" subtitle="Transfers to Branches" showBack>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <DateRangePicker
          dateFrom={dateFrom} dateTo={dateTo}
          onChangeDateFrom={setDateFrom} onChangeDateTo={setDateTo}
          onSearch={() => setSearch({ from: dateFrom, to: dateTo })}
          loading={isLoading}
        />

        {isLoading && <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />}

        {data && (
          <>
            {/* Grand total card */}
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total HQ Transfers Received</Text>
              <Text style={styles.totalValue}>{formatTZS(grandTotal)}</Text>
              <Text style={styles.totalSub}>
                {activeCount} of {branches.length} branches received funds
                {' · '}{data.date_from} to {data.date_to}
              </Text>
            </View>

            {/* Branch table */}
            <Text style={styles.sectionTitle}>Per Branch Summary</Text>
            <View style={styles.tableCard}>
              {/* Header */}
              <View style={[styles.row, styles.headerRow]}>
                <Text style={[styles.cell, styles.hText, { width: 40 }]}>S/N</Text>
                <Text style={[styles.cell, styles.hText, { flex: 1 }]}>Branch</Text>
                <Text style={[styles.cell, styles.hText, styles.right, { width: 130 }]}>Amount Received</Text>
              </View>

              {branches.map((b: any, i: number) => (
                <View key={b.branch} style={[
                  styles.row,
                  i % 2 === 1 && styles.rowAlt,
                  !b.has_transfer && styles.rowZero,
                ]}>
                  <Text style={[styles.cell, { width: 40, color: Colors.textMuted }]}>{b.sn}</Text>
                  <Text style={[styles.cell, { flex: 1, fontWeight: Typography.weights.semibold }]}>{b.branch}</Text>
                  {b.has_transfer
                    ? <Text style={[styles.cell, styles.right, { width: 130, color: Colors.success, fontWeight: Typography.weights.bold }]}>
                        {formatTZS(b.total_amount)}
                      </Text>
                    : <Text style={[styles.cell, styles.right, { width: 130, color: Colors.textMuted }]}>—</Text>
                  }
                </View>
              ))}

              {/* Footer totals row */}
              <View style={[styles.row, styles.footerRow]}>
                <Text style={[styles.cell, styles.footText, { width: 40 }]}> </Text>
                <Text style={[styles.cell, styles.footText, { flex: 1 }]}>TOTAL</Text>
                <Text style={[styles.cell, styles.footText, styles.right, { width: 130 }]}>
                  {formatTZS(grandTotal)}
                </Text>
              </View>
            </View>

            {/* Empty state */}
            {branches.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No HQ transfers found for this period.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  totalCard: {
    margin: Spacing.base, marginBottom: Spacing.sm,
    backgroundColor: '#0d1b2e', borderRadius: Radius.lg,
    padding: Spacing.base, alignItems: 'center', gap: 4,
  },
  totalLabel: { color: 'rgba(255,255,255,0.65)', fontSize: Typography.sizes.sm },
  totalValue: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 2 },
  totalSub:   { color: 'rgba(255,255,255,0.5)', fontSize: Typography.sizes.xs, textAlign: 'center', marginTop: 2 },

  sectionTitle: {
    fontSize: Typography.sizes.xs, fontWeight: Typography.weights.bold,
    color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6,
    marginHorizontal: Spacing.base, marginBottom: Spacing.xs,
  },
  tableCard: {
    marginHorizontal: Spacing.base,
    borderRadius: Radius.md, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, paddingHorizontal: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowAlt:    { backgroundColor: Colors.surfaceAlt },
  rowZero:   { opacity: 0.5 },
  headerRow: { backgroundColor: '#0da9a9', borderBottomWidth: 0 },
  footerRow: { backgroundColor: '#0d1b2e', borderBottomWidth: 0 },
  cell:      { fontSize: Typography.sizes.sm, color: Colors.text, paddingHorizontal: 2 },
  hText:     { color: '#fff', fontWeight: Typography.weights.bold, textTransform: 'uppercase', letterSpacing: 0.3 },
  footText:  { color: '#fff', fontWeight: Typography.weights.bold },
  right:     { textAlign: 'right' },

  emptyBox:  { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
});
