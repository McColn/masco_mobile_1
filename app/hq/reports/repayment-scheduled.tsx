import React, { useState } from 'react';
import { ScrollView, ActivityIndicator, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { SummaryTable } from '@/components/ui/SummaryTable';
import { StatsBanner } from '@/components/ui/StatsBanner';
import api from '@/lib/api';
import { formatTZS, getTodayLocal } from '@/lib/format';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { DateInput } from '@/components/ui/DateInput';

export default function HQRepaymentScheduledScreen() {
  const today = getTodayLocal();
  const [month, setMonth] = useState(today);
  const [search, setSearch] = useState<string|null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['hq-repayment-scheduled', search],
    queryFn: () => api.get('/reports/monthly-outstanding-summary/', { params: { month: search } }).then(r => r.data),
    enabled: !!search,
  });

  return (
    <ScreenLayout title="Repayment Scheduled" subtitle="HQ" showBack>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.row}>
          <DateInput value={month} onChange={setMonth} />
          <TouchableOpacity style={styles.btn} onPress={() => setSearch(month)}>
            <Text style={styles.btnText}>Generate</Text>
          </TouchableOpacity>
        </View>
        {isLoading && <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />}
        {data && (
          <>
            <StatsBanner stats={[
              { label: 'Total Loans', value: String(data.totals?.no_of_loans ?? 0), color: Colors.primary },
              { label: 'Outstanding', value: formatTZS(data.totals?.outstanding_amount ?? 0), color: Colors.error },
            ]} />
            <SummaryTable
              columns={[
                { key: 'branch', label: 'Branch' },
                { key: 'no_of_loans', label: 'Loans', align: 'center' },
                { key: 'outstanding_amount', label: 'Outstanding', type: 'currency', align: 'right' },
              ]}
              rows={data.branches ?? []}
            />
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.base },
  input: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: Typography.sizes.sm, color: Colors.text, backgroundColor: Colors.surface },
  btn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: 16, justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: Typography.weights.bold, fontSize: Typography.sizes.sm },
});
