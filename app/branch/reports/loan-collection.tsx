import React, { useState } from 'react';
import { ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { SummaryTable } from '@/components/ui/SummaryTable';
import { StatsBanner } from '@/components/ui/StatsBanner';
import { ReportService } from '@/lib/services';
import { formatTZS, getTodayLocal } from '@/lib/format';
import { Colors } from '@/constants/theme';

export default function LoanCollectionScreen() {
  const today = getTodayLocal();
  const [dateFrom, setDateFrom] = useState(today.slice(0,7) + '-01');
  const [dateTo, setDateTo] = useState(today);
  const [search, setSearch] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['loan-collection', search],
    queryFn: () => ReportService.loanCollection({ date_from: search.from, date_to: search.to }),
    enabled: !!search,
  });

  return (
    <ScreenLayout title="Loans Collection Statement" showBack>
      <ScrollView showsVerticalScrollIndicator={false}>
        <DateRangePicker dateFrom={dateFrom} dateTo={dateTo}
          onChangeDateFrom={setDateFrom} onChangeDateTo={setDateTo}
          onSearch={() => setSearch({ from: dateFrom, to: dateTo })} loading={isLoading} />
        {isLoading && <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />}
        {data && (
          <>
            <StatsBanner stats={[{ label: 'Grand Total', value: formatTZS(data.grand_total), color: Colors.success }]} />
            <SummaryTable
              columns={[
                { key: 'date', label: 'Date' },
                { key: 'receipt_no', label: 'Receipt' },
                { key: 'name', label: 'Client' },
                { key: 'amount', label: 'Amount', type: 'currency', align: 'right' },
              ]}
              rows={data.rows ?? []}
              footer={{ date: 'TOTAL', amount: data.grand_total }}
            />
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}
