import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { formatTZS, getTodayLocal } from '@/lib/format';
import api from '@/lib/api';

const COL_WIDTHS = { sn: 36, branch: 120, loans: 60, loaned: 100, interest: 100, total: 100 };
const TEAL = '#0da9a9';

function THead() {
  return (
    <View style={[styles.row, styles.headerRow]}>
      <Text style={[styles.cell, styles.hText, { width: COL_WIDTHS.sn }]}>S/N</Text>
      <Text style={[styles.cell, styles.hText, { width: COL_WIDTHS.branch }]}>Branch</Text>
      <Text style={[styles.cell, styles.hText, styles.right, { width: COL_WIDTHS.loans }]}>Loans</Text>
      <Text style={[styles.cell, styles.hText, styles.right, { width: COL_WIDTHS.loaned }]}>Loaned</Text>
      <Text style={[styles.cell, styles.hText, styles.right, { width: COL_WIDTHS.interest }]}>Interest</Text>
      <Text style={[styles.cell, styles.hText, styles.right, { width: COL_WIDTHS.total }]}>Total Return</Text>
    </View>
  );
}

function TRow({ row, index }: { row: any; index: number }) {
  const isZero = row.no_of_loans === 0;
  return (
    <View style={[styles.row, index % 2 === 1 && styles.rowAlt, isZero && styles.rowZero]}>
      <Text style={[styles.cell, { width: COL_WIDTHS.sn, color: Colors.textMuted }]}>{row.sn}</Text>
      <Text style={[styles.cell, { width: COL_WIDTHS.branch, fontWeight: Typography.weights.semibold }]}>{row.branch}</Text>
      <Text style={[styles.cell, styles.right, { width: COL_WIDTHS.loans, color: isZero ? Colors.textMuted : Colors.primary }]}>{row.no_of_loans}</Text>
      <Text style={[styles.cell, styles.right, { width: COL_WIDTHS.loaned, color: isZero ? Colors.textMuted : Colors.text }]}>{formatTZS(row.loaned_amount)}</Text>
      <Text style={[styles.cell, styles.right, { width: COL_WIDTHS.interest, color: isZero ? Colors.textMuted : Colors.accent }]}>{formatTZS(row.interest_amount)}</Text>
      <Text style={[styles.cell, styles.right, { width: COL_WIDTHS.total, color: isZero ? Colors.textMuted : Colors.success }]}>{formatTZS(row.total_return)}</Text>
    </View>
  );
}

function TFooter({ totals }: { totals: any }) {
  return (
    <View style={[styles.row, styles.footerRow]}>
      <Text style={[styles.cell, styles.footText, { width: COL_WIDTHS.sn + COL_WIDTHS.branch }]}>TOTAL</Text>
      <Text style={[styles.cell, styles.footText, styles.right, { width: COL_WIDTHS.loans }]}>{totals.no_of_loans}</Text>
      <Text style={[styles.cell, styles.footText, styles.right, { width: COL_WIDTHS.loaned }]}>{formatTZS(totals.loaned_amount)}</Text>
      <Text style={[styles.cell, styles.footText, styles.right, { width: COL_WIDTHS.interest }]}>{formatTZS(totals.interest_amount)}</Text>
      <Text style={[styles.cell, styles.footText, styles.right, { width: COL_WIDTHS.total }]}>{formatTZS(totals.total_return)}</Text>
    </View>
  );
}

export default function HQLoansIssuedScreen() {
  const today = getTodayLocal();
  const [dateFrom, setDateFrom] = useState(today.slice(0, 7) + '-01');
  const [dateTo,   setDateTo]   = useState(today);
  const [search,   setSearch]   = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['hq-loans-issued-summary', search],
    queryFn: () => api.get('/reports/loans-issued-summary/', {
      params: { date_from: search.from, date_to: search.to },
    }).then(r => r.data),
    enabled: !!search,
  });

  const branches: any[] = data?.branches ?? [];
  const totals           = data?.totals;

  return (
    <ScreenLayout title="Loans Issued" subtitle="HQ Report" showBack>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <DateRangePicker
          dateFrom={dateFrom} dateTo={dateTo}
          onChangeDateFrom={setDateFrom} onChangeDateTo={setDateTo}
          onSearch={() => setSearch({ from: dateFrom, to: dateTo })}
          loading={isLoading}
        />

        {isLoading && <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />}

        {data && branches.length > 0 && (
          <>
            {/* Summary stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={[styles.statVal, { color: TEAL }]}>{totals?.no_of_loans ?? 0}</Text>
                <Text style={styles.statLbl}>Total Loans</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statVal, { color: Colors.primary }]}>{formatTZS(totals?.loaned_amount ?? 0)}</Text>
                <Text style={styles.statLbl}>Loaned Amount</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statVal, { color: Colors.success }]}>{formatTZS(totals?.total_return ?? 0)}</Text>
                <Text style={styles.statLbl}>Total Return</Text>
              </View>
            </View>

            {/* Period label */}
            <Text style={styles.periodLabel}>
              Period: {data.date_from} to {data.date_to}
            </Text>

            {/* Scrollable table */}
            <ScrollView horizontal showsHorizontalScrollIndicator style={styles.tableWrapper}>
              <View style={styles.table}>
                <THead />
                {branches.map((row, i) => <TRow key={row.sn} row={row} index={i} />)}
                {totals && <TFooter totals={totals} />}
              </View>
            </ScrollView>
          </>
        )}

        {data && branches.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No data for this period.</Text>
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: Spacing.sm, margin: Spacing.base, marginBottom: Spacing.xs },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', ...Shadow.sm },
  statVal: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold },
  statLbl: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 2 },
  periodLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted, textAlign: 'center', marginBottom: Spacing.sm },
  tableWrapper: { marginHorizontal: Spacing.base },
  table: { borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowAlt: { backgroundColor: Colors.surfaceAlt },
  rowZero: { opacity: 0.55 },
  headerRow: { backgroundColor: '#0da9a9', borderBottomWidth: 0 },
  footerRow: { backgroundColor: '#0d1b2e', borderBottomWidth: 0 },
  cell: { fontSize: Typography.sizes.xs, color: Colors.text, paddingHorizontal: 4 },
  hText: { color: '#fff', fontWeight: Typography.weights.bold, textTransform: 'uppercase', letterSpacing: 0.3 },
  footText: { color: '#fff', fontWeight: Typography.weights.bold },
  right: { textAlign: 'right' },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
});
