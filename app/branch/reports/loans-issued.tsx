// Branch Loans Issued Report — mirrors loan_issued_report() web view
// Screenshot columns: S/N | Date | Name | Check No | Mobile No | Work Station |
//   Loan ID | Rate Type | Starting Month | Loaned Amount | Period |
//   Interest Rate % | Interest Amount | Total Amount (P+I) | Monthly Installment
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

// Column widths matching screenshot proportions
const COL = {
  sn:          36,
  date:        88,
  name:        170,
  checkNo:     80,
  mobile:      105,
  workStation: 100,
  loanId:      100,
  rateType:    70,
  startMonth:  90,
  loanAmt:     110,
  period:      55,
  intRate:     90,
  intAmt:      110,
  totalAmt:    115,
  monthly:     115,
};

const TEAL = '#5bc0de';   // screenshot header colour
const GOLD = '#c8a96e';   // grand total row colour
const NAVY = '#0d1b2e';

function fmtN(v: any): string {
  const n = Number(v) || 0;
  if (n === 0) return '';
  return Math.round(n).toLocaleString('en-US');
}

export default function LoansIssuedScreen() {
  const today = getTodayLocal();
  const [dateFrom, setDateFrom] = useState(today.slice(0, 7) + '-01');
  const [dateTo,   setDateTo]   = useState(today);
  const [search,   setSearch]   = useState<any>(null);
  const { selectedBranch } = useBranchStore();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['loans-issued-branch', search, selectedBranch?.id],
    queryFn: () => ReportService.loansIssued({ date_from: search.from, date_to: search.to }),
    enabled: !!search,
  });

  const loans: any[] = data?.loans ?? [];
  const fmt = (d: string) => d?.split('-').reverse().join('/') ?? '';
  const branchName = data?.branch_name ?? selectedBranch?.name?.toUpperCase() ?? '';

  return (
    <ScreenLayout title="Loans Issued" subtitle={selectedBranch?.name} showBack>
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
            {/* Title block — matches screenshot */}
            <Text style={s.branchTitle}>{branchName} BRANCH</Text>
            <Text style={s.reportTitle}>
              MONTHLY LOAN ISSUED FROM {fmt(data.date_from)} TO {fmt(data.date_to)}
            </Text>

            {loans.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyText}>No loans issued in this period.</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginHorizontal: Spacing.base }}>
                <View style={s.table}>

                  {/* ── Column headers ── */}
                  <View style={[s.row, s.thead]}>
                    <Text style={[s.cell, s.th, { width: COL.sn,          textAlign: 'center' }]}>S/N</Text>
                    <Text style={[s.cell, s.th, { width: COL.date }]}>Date</Text>
                    <Text style={[s.cell, s.th, { width: COL.name }]}>Name</Text>
                    <Text style={[s.cell, s.th, { width: COL.checkNo }]}>Check No.</Text>
                    <Text style={[s.cell, s.th, { width: COL.mobile }]}>Mobile No.</Text>
                    <Text style={[s.cell, s.th, { width: COL.workStation }]}>Work Station</Text>
                    <Text style={[s.cell, s.th, { width: COL.loanId }]}>Loan ID</Text>
                    <Text style={[s.cell, s.th, { width: COL.rateType }]}>Rate Type</Text>
                    <Text style={[s.cell, s.th, { width: COL.startMonth }]}>Starting Month</Text>
                    <Text style={[s.cell, s.th, { width: COL.loanAmt, textAlign: 'right' }]}>Loaned Amount{'\n'}(Principal)</Text>
                    <Text style={[s.cell, s.th, { width: COL.period,  textAlign: 'center' }]}>Period</Text>
                    <Text style={[s.cell, s.th, { width: COL.intRate, textAlign: 'center' }]}>Interest Rate %</Text>
                    <Text style={[s.cell, s.th, { width: COL.intAmt,  textAlign: 'right' }]}>Interest Amount</Text>
                    <Text style={[s.cell, s.th, { width: COL.totalAmt,textAlign: 'right' }]}>Total Amount (P+I)</Text>
                    <Text style={[s.cell, s.th, { width: COL.monthly, textAlign: 'right' }]}>Monthly Installment</Text>
                  </View>

                  {/* ── Data rows ── */}
                  {loans.map((loan: any, i: number) => (
                    <View key={loan.id ?? i} style={[s.row, i % 2 === 1 && s.rowAlt]}>
                      <Text style={[s.cell, { width: COL.sn, textAlign: 'center', color: Colors.textMuted }]}>{loan.sn}</Text>
                      <Text style={[s.cell, { width: COL.date, color: Colors.primary, textDecorationLine: 'underline' }]}>
                        {loan.date?.split('-').reverse().join('/')}
                      </Text>
                      <Text style={[s.cell, { width: COL.name, fontWeight: '600' }]} numberOfLines={1}>{loan.name}</Text>
                      <Text style={[s.cell, { width: COL.checkNo }]}>{loan.check_no}</Text>
                      <Text style={[s.cell, { width: COL.mobile }]}>{loan.mobile}</Text>
                      <Text style={[s.cell, { width: COL.workStation, color: Colors.textMuted }]} numberOfLines={1}>{loan.work_station}</Text>
                      <Text style={[s.cell, { width: COL.loanId, color: Colors.primary }]}>{loan.loan_id_label}</Text>
                      <Text style={[s.cell, { width: COL.rateType, color: Colors.textMuted }]}>{loan.rate_type}</Text>
                      <Text style={[s.cell, { width: COL.startMonth }]}>{loan.starting_month}</Text>
                      <Text style={[s.cell, { width: COL.loanAmt, textAlign: 'right', fontWeight: '600' }]}>{fmtN(loan.loan_amount)}</Text>
                      <Text style={[s.cell, { width: COL.period,  textAlign: 'center' }]}>{loan.period}</Text>
                      <Text style={[s.cell, { width: COL.intRate, textAlign: 'center' }]}>{loan.interest_rate}</Text>
                      <Text style={[s.cell, { width: COL.intAmt,  textAlign: 'right' }]}>{fmtN(loan.interest_amount)}</Text>
                      <Text style={[s.cell, { width: COL.totalAmt,textAlign: 'right' }]}>{fmtN(loan.total_amount)}</Text>
                      <Text style={[s.cell, { width: COL.monthly, textAlign: 'right' }]}>{fmtN(loan.monthly_installment)}</Text>
                    </View>
                  ))}

                  {/* ── GRAND TOTAL row — gold background matching screenshot ── */}
                  <View style={[s.row, s.tfoot]}>
                    <Text style={[s.cell, s.tfootText, { width: COL.sn + COL.date + COL.name + COL.checkNo + COL.mobile + COL.workStation + COL.loanId + COL.rateType + COL.startMonth }]}>
                      GRAND TOTAL
                    </Text>
                    <Text style={[s.cell, s.tfootText, { width: COL.loanAmt,  textAlign: 'right' }]}>{fmtN(data.grand_loan_amount)}</Text>
                    <Text style={[s.cell, s.tfootText, { width: COL.period,   textAlign: 'center' }]}> </Text>
                    <Text style={[s.cell, s.tfootText, { width: COL.intRate,  textAlign: 'center' }]}> </Text>
                    <Text style={[s.cell, s.tfootText, { width: COL.intAmt,   textAlign: 'right' }]}>{fmtN(data.grand_interest_amount)}</Text>
                    <Text style={[s.cell, s.tfootText, { width: COL.totalAmt, textAlign: 'right' }]}>{fmtN(data.grand_total_amount)}</Text>
                    <Text style={[s.cell, s.tfootText, { width: COL.monthly,  textAlign: 'right' }]}>{fmtN(data.grand_monthly_installment)}</Text>
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
  branchTitle: {
    textAlign: 'center', fontSize: 13, fontWeight: '800',
    color: NAVY, marginTop: Spacing.sm,
  },
  reportTitle: {
    textAlign: 'center', fontSize: 12, fontWeight: '800',
    color: NAVY, textDecorationLine: 'underline',
    marginBottom: Spacing.sm, marginHorizontal: Spacing.base,
    letterSpacing: 0.3,
  },
  table: {
    borderRadius: Radius.md, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 9, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowAlt: { backgroundColor: '#f0f8fa' },
  thead:  { backgroundColor: TEAL, borderBottomWidth: 2, borderBottomColor: '#4aa8c4' },
  tfoot:  { backgroundColor: GOLD, borderBottomWidth: 0 },
  cell:   { fontSize: 11, color: Colors.text, paddingHorizontal: 4 },
  th:     { color: '#fff', fontWeight: '700', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.2 },
  tfootText: { color: '#1a1a1a', fontWeight: '800', fontSize: 11 },
  emptyBox:  { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
});
