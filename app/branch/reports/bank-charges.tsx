// Bank Charges Statement — uses transaction_date with expense_date fallback
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
const TEAL = '#5bc0de';

function fmtN(v: any) { return Math.round(Number(v)||0).toLocaleString('en-US'); }

export default function BankChargesScreen() {
  const today = getTodayLocal();
  const [dateFrom, setDateFrom] = useState(today.slice(0,7) + '-01');
  const [dateTo,   setDateTo]   = useState(today);
  const [search,   setSearch]   = useState<any>(null);
  const { selectedBranch } = useBranchStore();

  const { data, isLoading } = useQuery({
    queryKey: ['bank-charges', search, selectedBranch?.id],
    queryFn: () => ReportService.bankCharges({ date_from: search.from, date_to: search.to }),
    enabled: !!search,
  });

  const rows: any[] = data?.rows ?? data?.charges ?? [];
  const grandTotal  = Number(data?.grand_total ?? 0);
  const branchName  = selectedBranch?.name?.toUpperCase() ?? '';
  const fmt = (d: string) => d?.split('-').reverse().join('/') ?? '';

  return (
    <ScreenLayout title="Bank Charges" subtitle={selectedBranch?.name} showBack>
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
              BANK CHARGES FROM {fmt(search?.from)} TO {fmt(search?.to)}
            </Text>

            {rows.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyText}>No bank charges in this period.</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginHorizontal: Spacing.base }}>
                <View style={s.table}>
                  {/* Header */}
                  <View style={[s.row, s.thead]}>
                    {['Date','Receipt #','Description','Amount','Method','Office'].map(h => (
                      <Text key={h} style={[s.cell, s.th,
                        h === 'Date'        ? { width: 90 } :
                        h === 'Receipt #'   ? { width: 75 } :
                        h === 'Description' ? { width: 200 } :
                        h === 'Amount'      ? { width: 110, textAlign: 'right' } :
                        h === 'Method'      ? { width: 70, textAlign: 'center' } :
                        { width: 110 }]}>{h}</Text>
                    ))}
                  </View>

                  {/* Data rows */}
                  {rows.map((r: any, i: number) => {
                    // date = transaction_date or expense_date fallback (already resolved in API)
                    const dateStr = r.date || '';
                    const isBank  = (r.payment_method || '').toLowerCase() === 'bank';
                    return (
                      <View key={r.id ?? i} style={[s.row, i % 2 === 1 && s.rowAlt]}>
                        <Text style={[s.cell, { width: 90, color: Colors.textSecondary }]}>
                          {dateStr ? dateStr.split('-').reverse().join('/') : '—'}
                        </Text>
                        <Text style={[s.cell, { width: 75, color: Colors.primary }]}>
                          {r.receipt_no ?? String(r.id).padStart(6,'0')}
                        </Text>
                        <Text style={[s.cell, { width: 200, color: Colors.textSecondary }]} numberOfLines={2}>
                          {r.description || '—'}
                        </Text>
                        <Text style={[s.cell, { width: 110, textAlign: 'right', fontWeight: '700', color: Colors.error }]}>
                          {fmtN(r.amount)}
                        </Text>
                        <View style={[s.cell, { width: 70, alignItems: 'center' }]}>
                          <View style={[s.methodBadge, { backgroundColor: isBank ? '#1a3a5c18' : '#15572418' }]}>
                            <Text style={[s.methodText, { color: isBank ? '#1a3a5c' : '#155724' }]}>
                              {isBank ? 'Bank' : 'Cash'}
                            </Text>
                          </View>
                        </View>
                        <Text style={[s.cell, { width: 110, color: Colors.textMuted }]} numberOfLines={1}>
                          {r.office || selectedBranch?.name || '—'}
                        </Text>
                      </View>
                    );
                  })}

                  {/* Grand total */}
                  <View style={[s.row, s.tfoot]}>
                    <Text style={[s.cell, s.tfootText, { width: 90 + 75 + 200 }]}>Grand Total</Text>
                    <Text style={[s.cell, s.tfootText, { width: 110, textAlign: 'right' }]}>{fmtN(grandTotal)}</Text>
                    <Text style={[s.cell, { width: 70 + 110 }]}> </Text>
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
  table:        { borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  row:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowAlt:       { backgroundColor: '#f8f9fa' },
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
