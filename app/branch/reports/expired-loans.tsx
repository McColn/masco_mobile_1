// Expired Loans — mirrors expired_loans() web view exactly
// Screenshot columns: S/N | Name | Check no | Contact | Loan Type | Decision Date |
//   Start Month | End Month | Loaned Amount | Paid Amount | Outstanding | Expired Days | Status
import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { useBranchStore } from '@/store/branchStore';
import { LoanService } from '@/lib/services';

const TEAL = '#5bc0de';
const GOLD = '#c8a96e';
const NAVY = '#0d1b2e';

// Status badge colours matching web classification
const STATUS_COLORS: Record<string, string> = {
  Substandard: '#856404',  // amber
  Doubtful:    '#721c24',  // red
  Loss:        '#495057',  // dark grey
};

function fmtN(v: any): string {
  const n = Number(v) || 0;
  if (n === 0) return '0';
  return Math.round(n).toLocaleString('en-US');
}

function fmtDate(d: string): string {
  if (!d || d === '—') return '—';
  // YYYY-MM-DD → DD/MM/YYYY
  const parts = d.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
}

export default function ExpiredLoansScreen() {
  const { selectedBranch } = useBranchStore();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['expired-loans', selectedBranch?.id],
    queryFn: LoanService.expired,
  });

  const loans: any[] = data?.loans ?? [];
  const branchName   = data?.branch_name ?? selectedBranch?.name?.toUpperCase() ?? '';
  const upToLabel    = data?.up_to_label ?? '';

  return (
    <ScreenLayout title="Expired Loans" subtitle={selectedBranch?.name} showBack>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {isLoading && <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />}

        {data && (
          <>
            {/* Title block — matches screenshot */}
            <Text style={s.branchTitle}>{branchName} BRANCH</Text>
            <Text style={s.reportTitle}>EXPIRED LOANS UP TO {upToLabel}</Text>

            {/* Stats strip */}
            <View style={s.statsRow}>
              <View style={[s.statCard, { borderLeftColor: Colors.error }]}>
                <Text style={s.statLabel}>Count</Text>
                <Text style={[s.statVal, { color: Colors.error }]}>{loans.length}</Text>
              </View>
              <View style={[s.statCard, { borderLeftColor: Colors.primary }]}>
                <Text style={s.statLabel}>Total Loaned</Text>
                <Text style={[s.statVal, { color: Colors.primary }]}>{fmtN(data.total_loaned)}</Text>
              </View>
              <View style={[s.statCard, { borderLeftColor: Colors.success }]}>
                <Text style={s.statLabel}>Total Paid</Text>
                <Text style={[s.statVal, { color: Colors.success }]}>{fmtN(data.total_paid)}</Text>
              </View>
              <View style={[s.statCard, { borderLeftColor: Colors.error }]}>
                <Text style={s.statLabel}>Outstanding</Text>
                <Text style={[s.statVal, { color: Colors.error }]}>{fmtN(data.total_outstanding)}</Text>
              </View>
            </View>

            {loans.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyText}>No expired loans.</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginHorizontal: Spacing.base }}>
                <View style={s.table}>
                  {/* ── Header ── */}
                  <View style={[s.row, s.thead]}>
                    <Text style={[s.cell, s.th, { width: 40,  textAlign: 'center'  }]}>S/N</Text>
                    <Text style={[s.cell, s.th, { width: 190              }]}>Name</Text>
                    <Text style={[s.cell, s.th, { width: 95               }]}>Check no</Text>
                    <Text style={[s.cell, s.th, { width: 110              }]}>Contact</Text>
                    <Text style={[s.cell, s.th, { width: 80               }]}>Loan Type</Text>
                    <Text style={[s.cell, s.th, { width: 90               }]}>Decision Date</Text>
                    <Text style={[s.cell, s.th, { width: 80               }]}>Start Month</Text>
                    <Text style={[s.cell, s.th, { width: 80               }]}>End Month</Text>
                    <Text style={[s.cell, s.th, { width: 110, textAlign: 'right'   }]}>Loaned Amount</Text>
                    <Text style={[s.cell, s.th, { width: 100, textAlign: 'right'   }]}>Paid Amount</Text>
                    <Text style={[s.cell, s.th, { width: 100, textAlign: 'right'   }]}>Outstanding</Text>
                    <Text style={[s.cell, s.th, { width: 80,  textAlign: 'center'  }]}>Expired Days</Text>
                    <Text style={[s.cell, s.th, { width: 90,  textAlign: 'center'  }]}>Status</Text>
                  </View>

                  {/* ── Data rows ── */}
                  {loans.map((loan: any, i: number) => {
                    const statusColor = STATUS_COLORS[loan.status] ?? Colors.textMuted;
                    return (
                      <View key={loan.loan_id ?? i} style={[s.row, i % 2 === 1 && s.rowAlt]}>
                        <Text style={[s.cell, { width: 40,  textAlign: 'center', color: Colors.textMuted }]}>{loan.sn}</Text>
                        <Text style={[s.cell, { width: 190, fontWeight: '500' }]}>{loan.name}</Text>
                        <Text style={[s.cell, { width: 95,  color: Colors.textSecondary }]}>{loan.check_no}</Text>
                        <Text style={[s.cell, { width: 110, color: Colors.textSecondary }]}>{loan.contact}</Text>
                        <Text style={[s.cell, { width: 80,  color: Colors.textMuted }]}>{loan.loan_type}</Text>
                        <Text style={[s.cell, { width: 90,  color: Colors.textMuted }]}>{fmtDate(loan.decision_date)}</Text>
                        <Text style={[s.cell, { width: 80 }]}>{loan.start_month}</Text>
                        <Text style={[s.cell, { width: 80 }]}>{loan.end_month}</Text>
                        <Text style={[s.cell, { width: 110, textAlign: 'right', fontWeight: '600' }]}>{fmtN(loan.loaned_amount)}</Text>
                        <Text style={[s.cell, { width: 100, textAlign: 'right', color: Colors.success }]}>{fmtN(loan.paid_amount)}</Text>
                        <Text style={[s.cell, { width: 100, textAlign: 'right', color: Colors.error, fontWeight: '600' }]}>{fmtN(loan.outstanding)}</Text>
                        <Text style={[s.cell, { width: 80,  textAlign: 'center', fontWeight: '700', color: Colors.error }]}>{loan.expired_days}</Text>
                        <View style={[s.cell, { width: 90, alignItems: 'center', justifyContent: 'center' }]}>
                          <View style={[s.statusBadge, { backgroundColor: statusColor + '18' }]}>
                            <Text style={[s.statusText, { color: statusColor }]}>{loan.status}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}

                  {/* ── GRAND TOTAL ── */}
                  <View style={[s.row, s.tfoot]}>
                    <Text style={[s.cell, s.tfootText, { width: 40 + 190 + 95 + 110 + 80 + 90 + 80 + 80 }]}>TOTAL</Text>
                    <Text style={[s.cell, s.tfootText, { width: 110, textAlign: 'right' }]}>{fmtN(data.total_loaned)}</Text>
                    <Text style={[s.cell, s.tfootText, { width: 100, textAlign: 'right' }]}>{fmtN(data.total_paid)}</Text>
                    <Text style={[s.cell, s.tfootText, { width: 100, textAlign: 'right' }]}>{fmtN(data.total_outstanding)}</Text>
                    <Text style={[s.cell, { width: 80 + 90 }]}> </Text>
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
  statsRow:     { flexDirection: 'row', gap: 6, marginHorizontal: Spacing.base, marginBottom: Spacing.sm },
  statCard:     { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.sm, padding: 8, borderLeftWidth: 3, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  statLabel:    { fontSize: 9, color: Colors.textMuted, marginBottom: 2 },
  statVal:      { fontSize: 12, fontWeight: '700' },
  table:        { borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  row:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowAlt:       { backgroundColor: '#f0f8fa' },
  thead:        { backgroundColor: TEAL, borderBottomWidth: 2, borderBottomColor: '#4aa8c4' },
  tfoot:        { backgroundColor: GOLD, borderBottomWidth: 0 },
  cell:         { fontSize: 11, color: Colors.text, paddingHorizontal: 3 },
  th:           { color: '#fff', fontWeight: '700', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.2 },
  tfootText:    { color: '#1a1a1a', fontWeight: '800', fontSize: 11 },
  statusBadge:  { borderRadius: Radius.sm, paddingVertical: 2, paddingHorizontal: 6, alignItems: 'center' },
  statusText:   { fontSize: 10, fontWeight: '700' },
  emptyBox:     { padding: 40, alignItems: 'center' },
  emptyText:    { color: Colors.textMuted, fontSize: Typography.sizes.sm },
});
