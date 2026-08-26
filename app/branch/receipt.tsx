import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { LoanService, ClientService } from '@/lib/services';
import { formatTZS, formatDate } from '@/lib/format';
import { useDebounce } from '@/hooks/useDebounce';

export default function PaymentReceiptScreen() {
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const debouncedSearch = useDebounce(search, 400);

  const { data: clients } = useQuery({
    queryKey: ['receipt-client-search', debouncedSearch],
    queryFn: () => ClientService.list({ search: debouncedSearch, page_size: 10 }),
    enabled: debouncedSearch.length >= 2,
  });

  const { data: loans, isLoading } = useQuery({
    queryKey: ['client-loans-receipt', selectedClient?.id],
    queryFn: () => ClientService.loans(selectedClient.id),
    enabled: !!selectedClient?.id,
  });

  return (
    <ScreenLayout title="Payment Receipt" showBack>
      <View style={styles.searchCard}>
        <TextInput
          style={styles.input}
          placeholder="Search client (min 2 chars)..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={v => { setSearch(v); setSelectedClient(null); }}
        />
        {clients?.results?.map((c: any) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.option, selectedClient?.id === c.id && styles.optionActive]}
            onPress={() => { setSelectedClient(c); setSearch(`${c.firstname} ${c.lastname}`); }}
          >
            <Text style={styles.optionText}>{c.firstname} {c.lastname} — {c.phonenumber}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />}
      <FlatList
        data={loans}
        keyExtractor={(i: any) => String(i.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }: any) => (
          <View style={styles.loanCard}>
            <View style={styles.loanHeader}>
              <Text style={styles.loanId}>Loan #{item.id} — {item.loan_type}</Text>
              <Text style={styles.loanAmount}>{formatTZS(Number(item.loan_amount))}</Text>
            </View>
            {item.repayments?.map((r: any, i: number) => (
              <View key={r.id} style={[styles.repayRow, i % 2 === 1 && styles.repayRowAlt]}>
                <Text style={styles.repayDate}>{formatDate(r.repayment_date || r.payment_month)}</Text>
                <Text style={styles.repayMethod}>{r.transaction_method || 'cash'}</Text>
                <Text style={styles.repayAmt}>{formatTZS(Number(r.repayment_amount))}</Text>
              </View>
            ))}
            <View style={styles.loanFooter}>
              <Text style={styles.footerLabel}>Remaining:</Text>
              <Text style={[styles.footerValue, { color: Colors.error }]}>
                {formatTZS(Number(item.repayment_amount_remaining))}
              </Text>
            </View>
          </View>
        )}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  searchCard: { backgroundColor: Colors.surface, margin: Spacing.base, borderRadius: Radius.lg, padding: Spacing.base, ...Shadow.sm },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: Typography.sizes.sm, color: Colors.text },
  option: { padding: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  optionActive: { backgroundColor: Colors.primary + '10' },
  optionText: { fontSize: Typography.sizes.sm, color: Colors.text },
  list: { padding: Spacing.base, paddingTop: 0, gap: Spacing.sm, paddingBottom: 40 },
  loanCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  loanHeader: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: Colors.primary + '10', padding: Spacing.md },
  loanId: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.primary },
  loanAmount: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.primary },
  repayRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  repayRowAlt: { backgroundColor: Colors.surfaceAlt },
  repayDate: { flex: 1.5, fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  repayMethod: { flex: 1, fontSize: Typography.sizes.xs, color: Colors.textMuted, textTransform: 'capitalize' },
  repayAmt: { flex: 1, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, color: Colors.success, textAlign: 'right' },
  loanFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.md, backgroundColor: Colors.surfaceAlt },
  footerLabel: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  footerValue: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold },
});
