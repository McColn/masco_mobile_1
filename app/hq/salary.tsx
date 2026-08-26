import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { StatsBanner } from '@/components/ui/StatsBanner';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { SalaryService } from '@/lib/services';
import { formatTZS } from '@/lib/format';

export default function SalaryScreen() {
  const today = new Date();
  const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`);
  const [searchMonth, setSearchMonth] = useState(month);

  const { data, isLoading } = useQuery({
    queryKey: ['salary-slip', searchMonth],
    queryFn: () => SalaryService.slip({ month: searchMonth }),
  });

  const salaries = data?.salaries ?? [];
  const totals = data?.totals;

  return (
    <ScreenLayout title="Staff Salary" subtitle="HQ" showBack>
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
          <Text style={styles.goBtnText}>Go</Text>
        </TouchableOpacity>
      </View>

      {totals && <StatsBanner stats={[
        { label: 'Basic Total', value: formatTZS(totals.basic_salary), color: Colors.primary },
        { label: 'Deductions', value: formatTZS(totals.deduction), color: Colors.error },
        { label: 'Net Total', value: formatTZS(totals.net_salary), color: Colors.success },
      ]} />}

      {isLoading ? <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={salaries}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No salary records for this month.</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.employee_name?.split(' ').map((n:string)=>n[0]).join('').slice(0,2)||'??'}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.employee_name}</Text>
                <Text style={styles.branch}>{item.branch} · {item.transaction_method}</Text>
              </View>
              <View style={styles.amounts}>
                <Text style={styles.netSalary}>{formatTZS(item.net_salary)}</Text>
                {item.deduction > 0 && <Text style={styles.deduction}>-{formatTZS(item.deduction)}</Text>}
              </View>
            </View>
          )}
        />
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.base, paddingBottom: Spacing.sm },
  monthInput: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: Typography.sizes.sm, color: Colors.text, backgroundColor: Colors.surface },
  goBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: 20, justifyContent: 'center' },
  goBtnText: { color: '#fff', fontWeight: Typography.weights.bold },
  list: { padding: Spacing.base, paddingTop: 0, gap: Spacing.sm, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary + '18', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
  info: { flex: 1 },
  name: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.text },
  branch: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 1 },
  amounts: { alignItems: 'flex-end' },
  netSalary: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.success },
  deduction: { fontSize: Typography.sizes.xs, color: Colors.error },
  empty: { textAlign: 'center', color: Colors.textMuted, padding: 40 },
});
