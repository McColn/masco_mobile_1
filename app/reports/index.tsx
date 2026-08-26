import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { InfoCard } from '@/components/ui/InfoCard';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { ReportService } from '@/lib/services';
import { formatTZS } from '@/lib/format';
import { useBranchStore } from '@/store/branchStore';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function MonthlyReportScreen() {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear] = useState(today.getFullYear());
  const { selectedBranch } = useBranchStore();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['monthly-report', selectedMonth, selectedYear, selectedBranch?.id],
    queryFn: () => ReportService.monthly({ month: selectedMonth, year: selectedYear }),
  });

  return (
    <ScreenLayout title="Monthly Report" showBack>
      {/* Month picker */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.monthRow}
        style={styles.monthScroll}
      >
        {MONTHS.map((m, i) => {
          const num = i + 1;
          const active = selectedMonth === num;
          return (
            <TouchableOpacity
              key={m}
              style={[styles.monthChip, active && styles.monthChipActive]}
              onPress={() => setSelectedMonth(num)}
            >
              <Text style={[styles.monthText, active && styles.monthTextActive]}>{m}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {isLoading && <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />}
        {data && (
          <>
            <InfoCard
              title={`${MONTHS[selectedMonth - 1]} ${selectedYear} — Summary`}
              accent={Colors.primary}
              rows={[
                { label: 'Loans Disbursed', value: formatTZS(data.total_disbursed), color: Colors.primary },
                { label: 'Repayments Collected', value: formatTZS(data.total_collected), color: Colors.success },
                { label: 'Total Expenses', value: formatTZS(data.total_expenses), color: Colors.error },
                { label: 'New Clients', value: String(data.new_clients) },
              ]}
            />

            {data.loans_by_status && Object.keys(data.loans_by_status).length > 0 && (
              <InfoCard
                title="Loans by Status"
                accent={Colors.accent}
                rows={Object.entries(data.loans_by_status).map(([status, count]) => ({
                  label: status,
                  value: String(count),
                }))}
              />
            )}

            {data.expenses_by_type && Object.keys(data.expenses_by_type).length > 0 && (
              <InfoCard
                title="Expenses by Type"
                accent={Colors.teal}
                rows={Object.entries(data.expenses_by_type).map(([type, amount]) => ({
                  label: type,
                  value: formatTZS(Number(amount)),
                  color: Colors.error,
                }))}
              />
            )}
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  monthScroll: { maxHeight: 52, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  monthRow: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, gap: Spacing.xs },
  monthChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1.5,
    borderColor: Colors.border, backgroundColor: Colors.background,
  },
  monthChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  monthText: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, fontWeight: Typography.weights.medium },
  monthTextActive: { color: '#fff', fontWeight: Typography.weights.bold },
});
