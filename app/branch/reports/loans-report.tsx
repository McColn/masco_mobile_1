// Branch Loans Report — outstanding loans table with consistent UI
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { useBranchStore } from '@/store/branchStore';
import { LoanService } from '@/lib/services';

const TEAL = '#5bc0de';
const GOLD = '#c8a96e';
const NAVY = '#0d1b2e';

function fmtN(v: any): string {
  const n = Number(v) || 0;
  if (n === 0) return '0';
  return Math.round(n).toLocaleString('en-US');
}

export default function LoansReportScreen() {
  const { selectedBranch } = useBranchStore();
  const router = useRouter();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['loans-report', selectedBranch?.id],
    queryFn: LoanService.report,
  });

  const rows: any[] = data?.rows ?? [];
  const branchName  = selectedBranch?.name?.toUpperCase() ?? '';

  return (
    <ScreenLayout title="Loans Report" subtitle={selectedBranch?.name} showBack>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {isLoading && <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />}

        {data && (
          <>
            {/* Title */}
            <Text style={s.branchTitle}>{branchName} BRANCH</Text>
            <Text style={s.reportTitle}>LOANS OUTSTANDING REPORT</Text>

            {/* Stats strip */}
            <View style={s.statsRow}>
              <View style={[s.statCard, { borderLeftColor: Colors.primary }]}>
                <Text style={s.statLabel}>Total Loan</Text>
                <Text style={[s.statVal, { color: Colors.primary }]}>{fmtN(data.grand_loan_amount)}</Text>
              </View>
              <View style={[s.statCard, { borderLeftColor: Colors.success }]}>
                <Text style={s.statLabel}>Total Paid</Text>
                <Text style={[s.statVal, { color: Colors.success }]}>{fmtN(data.grand_paid_amount)}</Text>
              </View>
              <View style={[s.statCard, { borderLeftColor: Colors.error }]}>
                <Text style={s.statLabel}>Outstanding</Text>
                <Text style={[s.statVal, { color: Colors.error }]}>{fmtN(data.grand_balance)}</Text>
              </View>
            </View>

            {rows.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyText}>No outstanding loans.</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginHorizontal: Spacing.base }}>
                <View style={s.table}>
                  {/* Header */}
                  <View style={[s.row, s.thead]}>
                    {['S/N','Client','Check No','Type','Loan Amount','Paid','Balance'].map(h => (
                      <Text key={h} style={[s.cell, s.th,
                        h === 'S/N'         ? { width: 36, textAlign: 'center' } :
                        h === 'Client'      ? { width: 160 } :
                        h === 'Check No'    ? { width: 90 } :
                        h === 'Type'        ? { width: 80 } :
                        { width: 115, textAlign: 'right' }]}>{h}</Text>
                    ))}
                  </View>

                  {/* Rows */}
                  {rows.map((r: any, i: number) => (
                    <TouchableOpacity key={r.id ?? i}
                      style={[s.row, i % 2 === 1 && s.rowAlt]}
                      onPress={() => router.push(`/loans/${r.id}` as any)}>
                      <Text style={[s.cell, { width: 36, textAlign: 'center', color: Colors.textMuted }]}>{i + 1}</Text>
                      <Text style={[s.cell, { width: 160, fontWeight: '600' }]} numberOfLines={1}>{r.name}</Text>
                      <Text style={[s.cell, { width: 90, color: Colors.textMuted }]}>{r.check_no}</Text>
                      <Text style={[s.cell, { width: 80, color: Colors.textMuted }]}>{r.loan_type}</Text>
                      <Text style={[s.cell, { width: 115, textAlign: 'right' }]}>{fmtN(r.loan_amount)}</Text>
                      <Text style={[s.cell, { width: 115, textAlign: 'right', color: Colors.success }]}>{fmtN(r.paid_amount)}</Text>
                      <Text style={[s.cell, { width: 115, textAlign: 'right', color: Colors.error, fontWeight: '700' }]}>{fmtN(r.balance)}</Text>
                    </TouchableOpacity>
                  ))}

                  {/* Grand total */}
                  <View style={[s.row, s.tfoot]}>
                    <Text style={[s.cell, s.tfootText, { width: 36 + 160 + 90 + 80 }]}>TOTAL</Text>
                    <Text style={[s.cell, s.tfootText, { width: 115, textAlign: 'right' }]}>{fmtN(data.grand_loan_amount)}</Text>
                    <Text style={[s.cell, s.tfootText, { width: 115, textAlign: 'right' }]}>{fmtN(data.grand_paid_amount)}</Text>
                    <Text style={[s.cell, s.tfootText, { width: 115, textAlign: 'right' }]}>{fmtN(data.grand_balance)}</Text>
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
  rowAlt:       { backgroundColor: '#f0f8fa' },
  thead:        { backgroundColor: TEAL, borderBottomWidth: 2, borderBottomColor: '#4aa8c4' },
  tfoot:        { backgroundColor: GOLD, borderBottomWidth: 0 },
  cell:         { fontSize: 11, color: Colors.text, paddingHorizontal: 4 },
  th:           { color: '#fff', fontWeight: '700', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.2 },
  tfootText:    { color: '#1a1a1a', fontWeight: '800', fontSize: 11 },
  emptyBox:     { padding: 40, alignItems: 'center' },
  emptyText:    { color: Colors.textMuted, fontSize: Typography.sizes.sm },
});
