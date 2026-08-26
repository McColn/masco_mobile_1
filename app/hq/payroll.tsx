import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { StatsBanner } from '@/components/ui/StatsBanner';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { PayrollService } from '@/lib/services';
import { formatTZS } from '@/lib/format';

export default function PayrollScreen() {
  const today = new Date();
  const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`);
  const [searchMonth, setSearchMonth] = useState(month);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-report', searchMonth],
    queryFn: () => PayrollService.report({ month: searchMonth }),
  });

  const { mutate: submitPayroll, isPending } = useMutation({
    mutationFn: () => PayrollService.submit({ month: searchMonth }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-report'] });
      Toast.show({ type: 'success', text1: 'Payroll Submitted', text2: `Salaries for ${searchMonth} processed.` });
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: 'Failed', text2: e?.response?.data?.detail || 'Error' }),
  });

  const confirmSubmit = () => {
    Alert.alert('Confirm Payroll', `Submit payroll for ${searchMonth}? This will process all salary payments.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Submit', style: 'default', onPress: () => submitPayroll() },
    ]);
  };

  const employees = data?.employees ?? data?.salaries ?? [];

  return (
    <ScreenLayout title="Salary Payment" subtitle="HQ" showBack>
      <View style={styles.monthRow}>
        <TextInput
          style={styles.monthInput}
          value={month}
          onChangeText={setMonth}
          placeholder="YYYY-MM"
          placeholderTextColor={Colors.textMuted}
          onSubmitEditing={() => setSearchMonth(month)}
        />
        <TouchableOpacity style={styles.goBtn} onPress={() => setSearchMonth(month)}>
          <Text style={styles.goBtnText}>Load</Text>
        </TouchableOpacity>
      </View>

      {data?.totals && <StatsBanner stats={[
        { label: 'Total Net', value: formatTZS(data.totals.net_salary ?? data.total_net ?? 0), color: Colors.success },
        { label: 'Staff Count', value: String(employees.length), color: Colors.primary },
      ]} />}

      {isLoading ? <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {employees.map((emp: any, i: number) => (
            <View key={i} style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{emp.employee_name?.split(' ').map((n:string)=>n[0]).join('').slice(0,2)||'??'}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{emp.employee_name}</Text>
                <Text style={styles.branch}>{emp.branch}</Text>
              </View>
              <View style={styles.amounts}>
                <Text style={styles.gross}>{formatTZS(emp.basic_salary ?? emp.gross_salary ?? 0)}</Text>
                <Text style={styles.net}>Net: {formatTZS(emp.net_salary ?? 0)}</Text>
              </View>
            </View>
          ))}

          {employees.length > 0 && (
            <TouchableOpacity style={[styles.submitBtn, isPending && {opacity:0.7}]} onPress={confirmSubmit} disabled={isPending}>
              <Text style={styles.submitText}>{isPending ? 'Processing...' : '💳  Submit Payroll'}</Text>
            </TouchableOpacity>
          )}
          {employees.length === 0 && !isLoading && (
            <Text style={styles.empty}>No payroll data. Enter a month and press Load.</Text>
          )}
        </ScrollView>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.base, paddingBottom: Spacing.sm },
  monthInput: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: Typography.sizes.sm, color: Colors.text, backgroundColor: Colors.surface },
  goBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: 16, justifyContent: 'center' },
  goBtnText: { color: '#fff', fontWeight: Typography.weights.bold },
  content: { padding: Spacing.base, paddingTop: 0, gap: Spacing.sm, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.teal + '20', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.teal, fontWeight: '700', fontSize: 13 },
  info: { flex: 1 },
  name: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.text },
  branch: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  amounts: { alignItems: 'flex-end' },
  gross: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  net: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.success },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center', marginTop: Spacing.md },
  submitText: { color: '#fff', fontWeight: Typography.weights.bold, fontSize: Typography.sizes.base },
  empty: { textAlign: 'center', color: Colors.textMuted, padding: 40 },
});
