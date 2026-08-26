// Trial Balance — mirrors trial_balance_report() web view exactly.
// Accessible from both HQ and branch menus; scoping handled server-side.
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { useBranchStore } from '@/store/branchStore';
import { ReportService } from '@/lib/services';
import { getTodayLocal } from '@/lib/format';

const NAVY  = '#1e40af';
const GOLD  = '#fde68a';
const GOLD_BORDER = '#f59e0b';
const GREEN_BG = '#dcfce7';
const GREEN_BORDER = '#16a34a';
const PURPLE = '#9333ea';

const TYPE_ICON: Record<string, string> = {
  Asset: '🪙', Equity: '👤', Expense: '🧾', Revenue: '📁',
};
const TYPE_BADGE_BG: Record<string, string> = {
  Asset: '#dcfce7', Equity: '#dbeafe', Expense: '#fef3c7', Revenue: '#ede9fe',
};
const TYPE_BADGE_FG: Record<string, string> = {
  Asset: '#15803d', Equity: '#1e40af', Expense: '#b45309', Revenue: '#6d28d9',
};

function fmtN(v: any): string {
  const n = Number(v) || 0;
  if (n === 0) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPlain(v: any): string {
  const n = Number(v) || 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const COL = { account: 170, type: 80, opening: 130, debit: 110, credit: 110, closing: 130 };

export default function TrialBalanceScreen() {
  const today = getTodayLocal();
  const [dateFrom, setDateFrom] = useState(today.slice(0, 4) + '-01-01');
  const [dateTo,   setDateTo]   = useState(today);
  const [search,   setSearch]   = useState<any>(null);
  const { selectedBranch } = useBranchStore();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['trial-balance', search, selectedBranch?.id],
    queryFn: () => ReportService.trialBalance({ start_date: search.from, end_date: search.to }),
    enabled: !!search,
    retry: 1,
  });

  const accounts: any[] = data?.accounts ?? [];

  return (
    <ScreenLayout title="Trial Balance" subtitle={selectedBranch?.name} showBack>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <DateRangePicker
          dateFrom={dateFrom} dateTo={dateTo}
          onChangeDateFrom={setDateFrom} onChangeDateTo={setDateTo}
          onSearch={() => setSearch({ from: dateFrom, to: dateTo })}
          loading={isLoading}
        />

        {isLoading && <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />}

        {isError && !isLoading && (
          <View style={s.emptyBox}>
            <Text style={{ fontSize: 28 }}>⚠️</Text>
            <Text style={{ color: Colors.error, fontWeight: '600', marginTop: 8 }}>Failed to load</Text>
            <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 }}>
              {(error as any)?.response?.data?.detail ?? (error as any)?.message ?? 'Network error'}
            </Text>
          </View>
        )}

        {data && (
          <>
            <Text style={s.heading}>🧮 Trial Balance</Text>
            <Text style={s.period}>Period: {data.start_date_display} to {data.end_date_display}</Text>
            <Text style={s.generated}>
              {data.branch_name} • Generated: {new Date(data.generated_at).toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </Text>

            {/* Summary banner */}
            <View style={s.summaryCard}>
              <Text style={s.summaryLabel}>Showing {accounts.length} accounts</Text>
              <View style={[s.balanceBadge, { backgroundColor: data.is_balanced ? '#dcfce7' : '#fee2e2' }]}>
                <Text style={[s.balanceBadgeText, { color: data.is_balanced ? '#15803d' : '#b91c1c' }]}>
                  {data.is_balanced ? '✓ Balanced' : '⚠ Not Balanced'}
                </Text>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginHorizontal: Spacing.base }}>
              <View style={s.table}>
                {/* Header */}
                <View style={[s.row, s.thead]}>
                  <Text style={[s.cell, s.th, { width: COL.account }]}>Account Details</Text>
                  <Text style={[s.cell, s.th, { width: COL.type }]}>Type</Text>
                  <Text style={[s.cell, s.th, { width: COL.opening, textAlign: 'right' }]}>Opening (TZS)</Text>
                  <Text style={[s.cell, s.th, { width: COL.debit,   textAlign: 'right' }]}>Debit (TZS)</Text>
                  <Text style={[s.cell, s.th, { width: COL.credit,  textAlign: 'right' }]}>Credit (TZS)</Text>
                  <Text style={[s.cell, s.th, { width: COL.closing, textAlign: 'right' }]}>Closing (TZS)</Text>
                </View>

                {/* Account rows */}
                {accounts.map((acc: any, i: number) => (
                  <View key={acc.code} style={[s.row, i % 2 === 1 && s.rowAlt]}>
                    <View style={{ width: COL.account, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6 }}>
                      <View style={[s.iconCircle, { backgroundColor: (TYPE_BADGE_BG[acc.type] ?? '#f1f5f9') }]}>
                        <Text style={{ fontSize: 13 }}>{TYPE_ICON[acc.type] ?? '📁'}</Text>
                      </View>
                      <View>
                        <Text style={s.accName}>{acc.name}</Text>
                        <Text style={s.accCode}>{acc.code}</Text>
                      </View>
                    </View>
                    <View style={[s.cell, { width: COL.type }]}>
                      <View style={[s.typeBadge, { backgroundColor: TYPE_BADGE_BG[acc.type] ?? '#f1f5f9' }]}>
                        <Text style={[s.typeBadgeText, { color: TYPE_BADGE_FG[acc.type] ?? '#475569' }]}>{acc.type}</Text>
                      </View>
                    </View>
                    <Text style={[s.cell, { width: COL.opening, textAlign: 'right', color: acc.opening ? Colors.text : Colors.textMuted }]}>
                      {fmtN(acc.opening)}
                    </Text>
                    <Text style={[s.cell, { width: COL.debit, textAlign: 'right', color: acc.debit ? GREEN_BORDER : Colors.textMuted, fontWeight: acc.debit ? '600' : '400' }]}>
                      {fmtN(acc.debit)}
                    </Text>
                    <Text style={[s.cell, { width: COL.credit, textAlign: 'right', color: acc.credit ? '#dc2626' : Colors.textMuted, fontWeight: acc.credit ? '600' : '400' }]}>
                      {fmtN(acc.credit)}
                    </Text>
                    <View style={{ width: COL.closing, alignItems: 'flex-end', paddingHorizontal: 6 }}>
                      <Text style={{ fontWeight: '600', fontSize: 12 }}>
                        {fmtPlain(acc.closing)}
                        {acc.is_credit_balance && <Text style={{ color: '#dc2626', fontSize: 10 }}>  (CR)</Text>}
                      </Text>
                    </View>
                  </View>
                ))}

                {/* Opening totals */}
                <View style={[s.row, { backgroundColor: '#e0f2fe', borderTopWidth: 2, borderTopColor: '#0284c7' }]}>
                  <Text style={[s.cell, s.tfootLabel, { width: COL.account + COL.type, textAlign: 'right' }]}>OPENING TOTALS:</Text>
                  <View style={{ width: COL.opening, paddingHorizontal: 6 }}>
                    <Text style={[s.tfootValue, { color: '#0369a1' }]}>DR: {fmtPlain(data.total_opening_debit)}</Text>
                    <Text style={[s.tfootValue, { color: '#0369a1' }]}>CR: {fmtPlain(data.total_opening_credit)}</Text>
                  </View>
                  <Text style={[s.cell, { width: COL.debit + COL.credit + COL.closing, textAlign: 'right', color: Colors.textMuted }]}>—</Text>
                </View>

                {/* Period movements */}
                <View style={[s.row, { backgroundColor: GOLD }]}>
                  <Text style={[s.cell, s.tfootLabel, { width: COL.account + COL.type + COL.opening, textAlign: 'right' }]}>PERIOD MOVEMENTS:</Text>
                  <Text style={[s.cell, { width: COL.debit, textAlign: 'right', color: GREEN_BORDER, fontWeight: '700' }]}>{fmtPlain(data.total_debit)}</Text>
                  <Text style={[s.cell, { width: COL.credit, textAlign: 'right', color: '#dc2626', fontWeight: '700' }]}>{fmtPlain(data.total_credit)}</Text>
                  <Text style={[s.cell, { width: COL.closing, textAlign: 'right', color: Colors.textMuted }]}>—</Text>
                </View>

                {/* Closing totals */}
                <View style={[s.row, { backgroundColor: GREEN_BG, borderTopWidth: 2, borderTopColor: GREEN_BORDER, borderBottomWidth: 0 }]}>
                  <Text style={[s.cell, s.tfootLabel, { width: COL.account + COL.type + COL.opening, textAlign: 'right', color: '#15803d' }]}>CLOSING TOTALS:</Text>
                  <Text style={[s.cell, { width: COL.debit, textAlign: 'right', color: '#15803d', fontWeight: '800' }]}>{fmtPlain(data.total_debit_closing)}</Text>
                  <Text style={[s.cell, { width: COL.credit, textAlign: 'right', color: '#dc2626', fontWeight: '800' }]}>{fmtPlain(data.total_credit_closing)}</Text>
                  <View style={{ width: COL.closing, paddingHorizontal: 6 }}>
                    {data.is_balanced ? (
                      <Text style={{ color: '#15803d', fontWeight: '700', fontSize: 11 }}>✓ Balanced</Text>
                    ) : (
                      <Text style={{ color: '#dc2626', fontWeight: '700', fontSize: 10 }}>
                        ✗ Off by {fmtPlain(Math.abs(Number(data.total_debit_closing) - Number(data.total_credit_closing)))}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </ScrollView>
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  heading: { textAlign: 'center', fontSize: 19, fontWeight: '800', color: Colors.text, marginTop: Spacing.md },
  period:  { textAlign: 'center', fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  generated: { textAlign: 'center', fontSize: 11, color: Colors.textMuted, marginTop: 4, marginBottom: Spacing.sm },

  summaryCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', borderRadius: Radius.md,
    marginHorizontal: Spacing.base, paddingHorizontal: 16, paddingVertical: 12, marginBottom: Spacing.sm,
  },
  summaryLabel: { fontWeight: '600', color: '#0c4a6e', fontSize: 13 },
  balanceBadge: { borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5 },
  balanceBadgeText: { fontWeight: '700', fontSize: 12 },

  table: { borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  row:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowAlt:{ backgroundColor: '#f8fafc' },
  thead: { backgroundColor: NAVY, borderBottomWidth: 0 },
  cell:  { fontSize: 12, color: Colors.text, paddingHorizontal: 6 },
  th:    { color: '#fff', fontWeight: '700', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 },

  iconCircle: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  accName: { fontWeight: '600', fontSize: 12, color: Colors.text },
  accCode: { fontSize: 10, color: Colors.textMuted, backgroundColor: '#f1f5f9', borderRadius: 4, paddingHorizontal: 5, marginTop: 2, alignSelf: 'flex-start' },

  typeBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  typeBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  tfootLabel: { fontWeight: '700', fontSize: 11, color: '#0c4a6e' },
  tfootValue: { fontWeight: '700', fontSize: 11, textAlign: 'right' },

  emptyBox: { padding: 40, alignItems: 'center' },
});
