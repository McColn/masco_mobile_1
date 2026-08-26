// Branch Transaction Statement — mirrors branch_transaction_statement_report() web view
// Columns: Date | Receipt # | Name | Description | Credit | Debit | Processed By
// 7 record types: repayments, topups, loans, expenses, salaries, bank charges, HQ transfers
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { useBranchStore } from '@/store/branchStore';
import { ReportService } from '@/lib/services';
import { getTodayLocal } from '@/lib/format';

const NAVY = '#0d1b2e';
const GOLD = '#c8a96e';

function fmtN(v: any): string {
  const n = Number(v) || 0;
  if (n === 0) return '';
  return Math.round(n).toLocaleString('en-US');
}

const TYPE_COLORS: Record<string, string> = {
  repayment: '#155724',
  topup:     '#0c5460',
  loan:      '#721c24',
  expense:   '#856404',
  salary:    '#4a235a',
  bankcharge:'#1a3a5c',
  hq:        '#0d3a2a',
};

export default function TransactionStatementScreen() {
  const today = getTodayLocal();
  const [dateFrom, setDateFrom] = useState(today.slice(0, 7) + '-01');
  const [dateTo,   setDateTo]   = useState(today);
  const [search,   setSearch]   = useState<any>(null);
  const { selectedBranch } = useBranchStore();

  const { data, isLoading } = useQuery({
    queryKey: ['transaction-statement', search, selectedBranch?.id],
    queryFn: () => ReportService.transactionStatement({ date_from: search.from, date_to: search.to }),
    enabled: !!search,
  });

  const rows: any[]  = data?.rows ?? [];
  const grandCredit  = Number(data?.grand_credit ?? 0);
  const grandDebit   = Number(data?.grand_debit  ?? 0);
  const fmt = (d: string) => d?.split('-').reverse().join('/') ?? '';

  return (
    <ScreenLayout title="Transaction Statement" subtitle={selectedBranch?.name} showBack>
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
            {/* Title */}
            <Text style={s.reportTitle}>
              BANK TRANSFER EXPENSES FROM {fmt(data.date_from)} TO {fmt(data.date_to)}
            </Text>
            <Text style={s.branchLabel}>BRANCH: {(selectedBranch?.name ?? data.branch ?? '').toUpperCase()}</Text>

            {/* Stats strip */}
            <View style={s.statsRow}>
              <View style={[s.statCard, { borderLeftColor: Colors.success }]}>
                <Text style={s.statLabel}>Total Credit</Text>
                <Text style={[s.statVal, { color: Colors.success }]}>{Math.round(grandCredit).toLocaleString('en-US')}</Text>
              </View>
              <View style={[s.statCard, { borderLeftColor: Colors.error }]}>
                <Text style={s.statLabel}>Total Debit</Text>
                <Text style={[s.statVal, { color: Colors.error }]}>{Math.round(grandDebit).toLocaleString('en-US')}</Text>
              </View>
              <View style={[s.statCard, { borderLeftColor: Colors.primary }]}>
                <Text style={s.statLabel}>Balance</Text>
                <Text style={[s.statVal, { color: Colors.primary }]}>{Math.round(grandCredit - grandDebit).toLocaleString('en-US')}</Text>
              </View>
            </View>

            {rows.length === 0 && (
              <View style={s.emptyBox}>
                <Text style={s.emptyText}>No transactions in this period.</Text>
              </View>
            )}

            {rows.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginHorizontal: Spacing.base }}>
                <View style={s.table}>
                  {/* Header */}
                  <View style={[s.row, s.thead]}>
                    {['Date','Receipt #','Name','Description','Credit','Debit','Processed By'].map(h => (
                      <Text key={h} style={[s.cell, s.theadText,
                        h === 'Date'         ? { width: 90 } :
                        h === 'Receipt #'    ? { width: 75 } :
                        h === 'Name'         ? { width: 130 } :
                        h === 'Description'  ? { width: 200 } :
                        h === 'Processed By' ? { width: 120 } :
                        { width: 100, textAlign: 'right' }]}>{h}</Text>
                    ))}
                  </View>

                  {/* Data rows — group by date */}
                  {rows.map((r: any, i: number) => (
                    <View key={i} style={[s.row, i % 2 === 1 && s.rowAlt, r.is_expense && s.rowExpense]}>
                      <Text style={[s.cell, { width: 90, color: r.hide_date ? 'transparent' : Colors.textSecondary }]}>
                        {r.hide_date ? '' : r.date?.split('-').reverse().join('/')}
                      </Text>
                      <Text style={[s.cell, { width: 75, color: Colors.primary, fontFamily: 'monospace' }]}>{r.receipt_no}</Text>
                      <Text style={[s.cell, { width: 130, fontWeight: '600' }]} numberOfLines={1}>{r.name}</Text>
                      <Text style={[s.cell, { width: 200, color: r.description_bold ? '#4a235a' : Colors.textSecondary, fontWeight: r.description_bold ? '600' : '400' }]} numberOfLines={2}>
                        {r.description}
                      </Text>
                      <Text style={[s.cell, { width: 100, textAlign: 'right', color: Colors.success, fontWeight: r.credit ? '700' : '400' }]}>
                        {r.credit ? fmtN(r.credit) : ''}
                      </Text>
                      <Text style={[s.cell, { width: 100, textAlign: 'right', color: Colors.error, fontWeight: r.debit ? '700' : '400' }]}>
                        {r.debit ? fmtN(r.debit) : ''}
                      </Text>
                      <Text style={[s.cell, { width: 120, color: Colors.textMuted }]} numberOfLines={1}>{r.processed_by}</Text>
                    </View>
                  ))}

                  {/* Grand total footer */}
                  <View style={[s.row, s.tfoot]}>
                    <Text style={[s.cell, s.tfootText, { width: 90 + 75 + 130 + 200 }]}>Grand Total</Text>
                    <Text style={[s.cell, s.tfootText, { width: 100, textAlign: 'right' }]}>{Math.round(grandCredit).toLocaleString('en-US')}</Text>
                    <Text style={[s.cell, s.tfootText, { width: 100, textAlign: 'right' }]}>{Math.round(grandDebit).toLocaleString('en-US')}</Text>
                    <Text style={[s.cell, { width: 120 }]}> </Text>
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
  reportTitle: { textAlign: 'center', fontSize: 12, fontWeight: '800', color: NAVY, textDecorationLine: 'underline', marginTop: Spacing.sm, marginHorizontal: Spacing.base, letterSpacing: 0.3 },
  branchLabel: { textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#1a4fa0', marginBottom: Spacing.sm },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.base, marginBottom: Spacing.sm },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 10, borderLeftWidth: 3, ...{shadowColor:'#000', shadowOpacity:0.05, shadowRadius:4, elevation:2} },
  statLabel: { fontSize: 10, color: Colors.textMuted, marginBottom: 2 },
  statVal:   { fontSize: 13, fontWeight: '700' },
  table: { borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowAlt:    { backgroundColor: '#f8f9fa' },
  rowExpense:{ backgroundColor: '#fff8f0' },
  thead: { backgroundColor: NAVY, borderBottomWidth: 0 },
  tfoot: { backgroundColor: GOLD, borderBottomWidth: 0 },
  cell:      { fontSize: 11, color: Colors.text, paddingHorizontal: 4 },
  theadText: { color: '#fff', fontWeight: '700', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3 },
  tfootText: { color: '#1a1a1a', fontWeight: '800', fontSize: 11 },
  emptyBox:  { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
});
