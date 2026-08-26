import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { LoanService } from '@/lib/services';
import { QK } from '@/lib/queryClient';
import { formatTZS, formatDate } from '@/lib/format';

export default function LoanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const loanId = Number(id);
  const [activeTab, setActiveTab] = useState<'details' | 'repayments' | 'schedule'>('details');

  const { data: loan, isLoading, refetch, isRefetching } = useQuery({
    queryKey: QK.loan(loanId),
    queryFn: () => LoanService.get(loanId),
    enabled: !!loanId,
  });

  const { data: repayments, isLoading: loadingRep } = useQuery({
    queryKey: ['loan-repayments', loanId],
    queryFn: () => LoanService.repayments(loanId),
    enabled: activeTab === 'repayments' && !!loanId,
  });

  const { data: schedule, isLoading: loadingSched } = useQuery({
    queryKey: ['loan-schedule', loanId],
    queryFn: () => LoanService.schedule(loanId),
    enabled: activeTab === 'schedule' && !!loanId,
  });

  if (isLoading) {
    return (
      <ScreenLayout title="Loan Details" showBack>
        <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 60 }} />
      </ScreenLayout>
    );
  }

  if (!loan) {
    return (
      <ScreenLayout title="Loan Details" showBack>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Loan not found.</Text>
        </View>
      </ScreenLayout>
    );
  }

  const paid       = Number(loan.total_repayment_amount || 0) - Number(loan.repayment_amount_remaining || 0);
  const total      = Number(loan.total_repayment_amount || 0);
  const progress   = total > 0 ? Math.min(paid / total, 1) : 0;
  const statusColor = Number(loan.repayment_amount_remaining) <= 0 ? Colors.success
    : Number(loan.repayment_amount_remaining) < Number(loan.loan_amount) * 0.3 ? Colors.warning
    : Colors.error;

  const TABS = [
    { key: 'details',    label: 'Details' },
    { key: 'repayments', label: 'Repayments' },
    { key: 'schedule',   label: 'Schedule' },
  ] as const;

  return (
    <ScreenLayout
      title={'Loan #' + loanId}
      showBack
      rightAction={
        <TouchableOpacity
          style={styles.payBtn}
          onPress={() => router.push('/branch/loan-payment' as any)}
        >
          <Text style={styles.payBtnText}>Pay</Text>
        </TouchableOpacity>
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroAmount}>{formatTZS(Number(loan.loan_amount))}</Text>
              <Text style={styles.heroLabel}>{loan.loan_type || 'Loan'} · {loan.office || ''}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {Number(loan.repayment_amount_remaining) <= 0 ? 'Completed' : 'Active'}
              </Text>
            </View>
          </View>
          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: (progress * 100) + '%', backgroundColor: statusColor }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>Paid: {formatTZS(paid)}</Text>
            <Text style={[styles.progressLabel, { color: statusColor }]}>
              Remaining: {formatTZS(Number(loan.repayment_amount_remaining))}
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, activeTab === t.key && styles.tabActive]}
              onPress={() => setActiveTab(t.key)}
            >
              <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ padding: Spacing.base }}>

          {/* Details tab */}
          {activeTab === 'details' && (
            <View style={styles.card}>
              {[
                ['Client',        loan.client_name],
                ['Loan Amount',   formatTZS(Number(loan.loan_amount))],
                ['Interest Rate', (loan.interest_rate || '—') + '%'],
                ['Period',        (loan.payment_period_months || '—') + ' months'],
                ['Monthly',       formatTZS(Number(loan.monthly_installment))],
                ['Total Repay',   formatTZS(Number(loan.total_repayment_amount))],
                ['Start Date',    formatDate(loan.first_repayment_date)],
                ['Applied',       formatDate(loan.application_date)],
                ['Transaction',   loan.transaction_method || '—'],
                ['Purpose',       loan.loan_purpose || '—'],
              ].map(([label, value], i, arr) => (
                <View key={label} style={[styles.row, i < arr.length - 1 && styles.rowBorder]}>
                  <Text style={styles.rowLabel}>{label}</Text>
                  <Text style={styles.rowValue}>{value || '—'}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Repayments tab */}
          {activeTab === 'repayments' && (
            <>
              {loadingRep ? (
                <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
              ) : !repayments || repayments.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No repayments yet.</Text>
                </View>
              ) : (
                <View style={styles.card}>
                  {(repayments as any[]).map((r, i) => (
                    <View key={r.id} style={[styles.repRow, i % 2 === 1 && { backgroundColor: Colors.surfaceAlt }]}>
                      <Text style={styles.repDate}>{formatDate(r.repayment_date || r.payment_month)}</Text>
                      <Text style={styles.repMethod}>{r.transaction_method || 'cash'}</Text>
                      <Text style={styles.repAmount}>{formatTZS(Number(r.repayment_amount))}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {/* Schedule tab */}
          {activeTab === 'schedule' && (
            <>
              {loadingSched ? (
                <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
              ) : !schedule ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No schedule available.</Text>
                </View>
              ) : (
                <View style={styles.card}>
                  {((schedule as any).schedule || []).map((row: any, i: number) => (
                    <View key={i} style={[styles.repRow, i % 2 === 1 && { backgroundColor: Colors.surfaceAlt }]}>
                      <Text style={styles.repDate}>{row.date}</Text>
                      <Text style={[styles.repMethod, { color: row.paid ? Colors.success : Colors.textMuted }]}>
                        {row.paid ? 'Paid' : 'Due'}
                      </Text>
                      <Text style={styles.repAmount}>{formatTZS(Number(row.amount))}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: Colors.primary, padding: Spacing.base },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  heroAmount: { color: '#fff', fontSize: 26, fontWeight: '800' },
  heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: Typography.sizes.sm, marginTop: 2 },
  statusBadge: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.bold },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  progressLabel: { fontSize: Typography.sizes.xs, color: 'rgba(255,255,255,0.85)' },
  payBtn: { backgroundColor: Colors.success, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 6 },
  payBtnText: { color: '#fff', fontWeight: Typography.weights.bold, fontSize: Typography.sizes.sm },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: Typography.sizes.sm, color: Colors.textMuted, fontWeight: Typography.weights.medium },
  tabTextActive: { color: Colors.primary, fontWeight: Typography.weights.bold },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: 11 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel: { fontSize: Typography.sizes.sm, color: Colors.textMuted, flex: 1 },
  rowValue: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium, color: Colors.text, flex: 1.2, textAlign: 'right' },
  repRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  repDate: { flex: 1.5, fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  repMethod: { flex: 1, fontSize: Typography.sizes.xs, color: Colors.textMuted, textTransform: 'capitalize' },
  repAmount: { flex: 1, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.bold, color: Colors.success, textAlign: 'right' },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
});
