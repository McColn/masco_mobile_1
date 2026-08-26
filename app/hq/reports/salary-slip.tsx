import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { SummaryTable } from '@/components/ui/SummaryTable';
import { StatsBanner } from '@/components/ui/StatsBanner';
import { ReportService } from '@/lib/services';
import { formatTZS } from '@/lib/format';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';

export default function SalarySlipScreen() {
  const today = new Date();
  const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`);
  const [searchMonth, setSearchMonth] = useState(month);

  const { data, isLoading } = useQuery({
    queryKey: ['salary-slip-report', searchMonth],
    queryFn: () => ReportService.salarySlip({ month: searchMonth }),
  });

  return (
    <ScreenLayout title="Salary Slip" subtitle="HQ" showBack>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.monthRow}>
          <TextInput style={styles.input} value={month} onChangeText={setMonth} placeholder="YYYY-MM" placeholderTextColor={Colors.textMuted} onSubmitEditing={() => setSearchMonth(month)} />
          <TouchableOpacity style={styles.goBtn} onPress={() => setSearchMonth(month)}>
            <Text style={styles.goBtnText}>View</Text>
          </TouchableOpacity>
        </View>
        {data?.totals && <StatsBanner stats={[
          { label: 'Basic', value: formatTZS(data.totals.basic_salary), color: Colors.primary },
          { label: 'Deductions', value: formatTZS(data.totals.deduction), color: Colors.error },
          { label: 'Net', value: formatTZS(data.totals.net_salary), color: Colors.success },
        ]} />}
        {isLoading && <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />}
        {data && (
          <SummaryTable
            title={`Payroll — ${searchMonth}`}
            columns={[
              { key: 'employee_name', label: 'Employee' },
              { key: 'branch', label: 'Branch' },
              { key: 'basic_salary', label: 'Basic', type: 'currency', align: 'right' },
              { key: 'deduction', label: 'Deduct', type: 'currency', align: 'right' },
              { key: 'net_salary', label: 'Net', type: 'currency', align: 'right' },
              { key: 'transaction_method', label: 'Method' },
            ]}
            rows={data.salaries ?? []}
            footer={{ employee_name: 'TOTAL', basic_salary: data.totals?.basic_salary, deduction: data.totals?.deduction, net_salary: data.totals?.net_salary }}
          />
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.base, paddingBottom: Spacing.sm },
  input: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: Typography.sizes.sm, color: Colors.text, backgroundColor: Colors.surface },
  goBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: 20, justifyContent: 'center' },
  goBtnText: { color: '#fff', fontWeight: Typography.weights.bold },
});
