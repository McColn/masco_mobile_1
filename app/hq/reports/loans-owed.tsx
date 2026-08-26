import React from 'react';
import { ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { SummaryTable } from '@/components/ui/SummaryTable';
import { StatsBanner } from '@/components/ui/StatsBanner';
import api from '@/lib/api';
import { formatTZS } from '@/lib/format';
import { Colors } from '@/constants/theme';

export default function HQLoansOwedScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['hq-monthly-outstanding-summary'],
    queryFn: () => api.get('/reports/monthly-outstanding-summary/').then(r => r.data),
  });

  return (
    <ScreenLayout title="Loans Owed" subtitle="HQ" showBack>
      <ScrollView showsVerticalScrollIndicator={false}>
        {isLoading && <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />}
        {data && (
          <>
            <StatsBanner stats={[
              { label: 'Total Loans', value: String(data.totals?.no_of_loans ?? 0), color: Colors.primary },
              { label: 'Outstanding', value: formatTZS(data.totals?.outstanding_amount ?? 0), color: Colors.error },
            ]} />
            <SummaryTable
              title="Outstanding by Branch"
              columns={[
                { key: 'branch', label: 'Branch' },
                { key: 'no_of_loans', label: 'Loans', align: 'center' },
                { key: 'outstanding_amount', label: 'Outstanding', type: 'currency', align: 'right' },
              ]}
              rows={data.branches ?? []}
              footer={{ branch: 'TOTAL', no_of_loans: data.totals?.no_of_loans, outstanding_amount: data.totals?.outstanding_amount }}
            />
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}
