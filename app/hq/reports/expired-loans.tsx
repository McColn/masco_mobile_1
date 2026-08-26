import React, { useState } from 'react';
import { ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { SummaryTable } from '@/components/ui/SummaryTable';
import { StatsBanner } from '@/components/ui/StatsBanner';
import api from '@/lib/api';
import { formatTZS } from '@/lib/format';
import { Colors } from '@/constants/theme';

export default function HQExpiredLoansScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['hq-expired-summary'],
    queryFn: () => api.get('/reports/expired-loans-summary/').then(r => r.data),
  });

  return (
    <ScreenLayout title="Expired Loans" subtitle="HQ" showBack>
      <ScrollView showsVerticalScrollIndicator={false}>
        {isLoading && <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />}
        {data && (
          <SummaryTable
            title="Expired Loans by Branch"
            columns={[
              { key: 'branch', label: 'Branch' },
              { key: 'total', label: 'Total', align: 'center' },
              { key: 'substandard', label: 'Sub-std', align: 'center' },
              { key: 'doubtful', label: 'Doubtful', align: 'center' },
              { key: 'loss', label: 'Loss', align: 'center' },
              { key: 'outstanding', label: 'Outstanding', type: 'currency', align: 'right' },
            ]}
            rows={data.branches ?? []}
          />
        )}
      </ScrollView>
    </ScreenLayout>
  );
}
