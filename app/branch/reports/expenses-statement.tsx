// Branch Expenses Statement — mirrors expenses_report() web view
// Uses transaction_date range. Columns: Date | Receipt # | Category | Description | Amount | Method
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { useBranchStore } from '@/store/branchStore';
import api from '@/lib/api';
import { getTodayLocal } from '@/lib/format';

const NAVY = '#0d1b2e';
const GOLD = '#c8a96e';
const TEAL = '#5bc0de';

function fmtN(v: any) { return Math.round(Number(v)||0).toLocaleString('en-US'); }

export default function ExpensesStatementScreen() {
  const today = getTodayLocal();
  const [dateFrom, setDateFrom] = useState(today.slice(0,7) + '-01');
  const [dateTo,   setDateTo]   = useState(today);
  const [search,   setSearch]   = useState<any>(null);
  const { selectedBranch } = useBranchStore();

  const { data, isLoading } = useQuery({
    queryKey: ['expenses-statement', search, selectedBranch?.id],
    // Use branch-expenses endpoint which uses transaction_date and returns per-row detail
    queryFn: () => api.get('/reports/branch-expenses/', {
      params: { date_from: search.from, date_to: search.to },
    }).then(r => r.data),
    enabled: !!search,
  });

  const rows: any[]  = data?.rows ?? [];
  const grandTotal   = Number(data?.grand_total ?? 0);
  const branchName   = data?.branch_name ?? selectedBranch?.name?.toUpperCase() ?? '';
  const fmt = (d: string) => d?.split('-').reverse().join('/') ?? '';

  return (
    <ScreenLayout title="Expenses Statement" subtitle={selectedBranch?.name} showBack>
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
            <Text style={s.branchTitle}>{branchName} BRANCH</Text>
            <Text style={s.reportTitle}>
              EXPENSES STATEMENT FROM {fmt(data.date_from)} TO {fmt(data.date_to)}
            </Text>

            {/* Stats */}
            <View style={s.statsRow}>
              <View style={[s.statCard, { borderLeftColor: Colors.error }]}>
                <Text style={s.statLabel}>Transactions</Text>
                <Text style={[s.statVal, { color: Colors.primary }]}>{rows.length}</Text>
              </View>
              <View style={[s.statCard, { borderLeftColor: Colors.error }]}>
                <Text style={s.statLabel}>Grand Total</Text>
                <Text style={[s.statVal, { color: Colors.error }]}>{fmtN(grandTotal)}</Text>
              </View>
            </View>

            {rows.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyText}>No expenses in this period.</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginHorizontal: Spacing.base }}>
                <View style={s.table}>
                  {/* Header */}
                  <View style={[s.row, s.thead]}>
                    {['Date','Receipt #','Category','Description','Amount','Method'].map(h => (
                      <Text key={h} style={[s.cell, s.th,
                        h === 'Date'        ? { width: 88 } :
                        h === 'Receipt #'   ? { width: 72 } :
                        h === 'Category'    ? { width: 130 } :
                        h === 'Description' ? { width: 200 } :
                        h === 'Amount'      ? { width: 110, textAlign: 'right' } :
                        { width: 70, textAlign: 'center' }]}>{h}</Text>
                    ))}
                  </View>

                  {/* Data rows */}
                  {rows.map((r: any, i: number) => (
                    <View key={r.id ?? i} style={[s.row, i % 2 === 1 && s.rowAlt]}>
                      <Text style={[s.cell, { width: 88, color: r.hide_date ? 'transparent' : Colors.textSecondary }]}>
                        {r.hide_date ? '' : r.date?.split('-').reverse().join('/')}
                      </Text>
                      <Text style={[s.cell, { width: 72, color: Colors.primary }]}>{r.receipt_no}</Text>
                      <Text style={[s.cell, { width: 130, fontWeight: '600', color: '#4a235a' }]} numberOfLines={1}>{r.category}</Text>
                      <Text style={[s.cell, { width: 200, color: Colors.textSecondary }]} numberOfLines={2}>{r.description}</Text>
                      <Text style={[s.cell, { width: 110, textAlign: 'right', fontWeight: '700', color: Colors.error }]}>{fmtN(r.amount)}</Text>
                      <View style={[s.cell, { width: 70, alignItems: 'center' }]}>
                        <View style={[s.methodBadge, { backgroundColor: r.is_bank ? '#1a3a5c18' : '#15572418' }]}>
                          <Text style={[s.methodText, { color: r.is_bank ? '#1a3a5c' : '#155724' }]}>
                            {r.is_bank ? 'Bank' : 'Cash'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}

                  {/* Grand total */}
                  <View style={[s.row, s.tfoot]}>
                    <Text style={[s.cell, s.tfootText, { width: 88 + 72 + 130 + 200 }]}>Grand Total</Text>
                    <Text style={[s.cell, s.tfootText, { width: 110, textAlign: 'right' }]}>{fmtN(grandTotal)}</Text>
                    <Text style={[s.cell, { width: 70 }]}> </Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  branchTitle:  { textAlign: 'center', fontSize: 13, fontWeight: '800', color: NAVY, marginTop: Spacing.sm },
  reportTitle:  { textAlign: 'center', fontSize: 12, fontWeight: '800', color: NAVY, textDecorationLine: 'underline', marginBottom: Spacing.sm, letterSpacing: 0.3 },
  statsRow:     { flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.base, marginBottom: Spacing.sm },
  statCard:     { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 10, borderLeftWidth: 3, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  statLabel:    { fontSize: 10, color: Colors.textMuted, marginBottom: 2 },
  statVal:      { fontSize: 13, fontWeight: '700' },
  table:        { borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  row:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowAlt:       { backgroundColor: '#fff8f0' },
  thead:        { backgroundColor: TEAL, borderBottomWidth: 2, borderBottomColor: '#4aa8c4' },
  tfoot:        { backgroundColor: GOLD, borderBottomWidth: 0 },
  cell:         { fontSize: 11, color: Colors.text, paddingHorizontal: 4 },
  th:           { color: '#fff', fontWeight: '700', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.2 },
  tfootText:    { color: '#1a1a1a', fontWeight: '800', fontSize: 11 },
  methodBadge:  { borderRadius: Radius.sm, paddingVertical: 2, paddingHorizontal: 6 },
  methodText:   { fontSize: 10, fontWeight: '700' },
  emptyBox:     { padding: 40, alignItems: 'center' },
  emptyText:    { color: Colors.textMuted, fontSize: Typography.sizes.sm },
});
