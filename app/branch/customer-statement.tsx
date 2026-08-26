import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { ReportService, ClientService } from '@/lib/services';
import { formatTZS } from '@/lib/format';
import { useDebounce } from '@/hooks/useDebounce';

export default function CustomerStatementScreen() {
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const debouncedSearch = useDebounce(search, 400);

  const { data: clients, isLoading: loadingClients } = useQuery({
    queryKey: ['client-search', debouncedSearch],
    queryFn: () => ClientService.list({ search: debouncedSearch, page_size: 10 }),
    enabled: debouncedSearch.length >= 2,
  });

  const { data: statement, isLoading: loadingStatement } = useQuery({
    queryKey: ['customer-statement', selectedClient?.id],
    queryFn: () => ReportService.customerStatement({ client_id: selectedClient.id }),
    enabled: !!selectedClient?.id,
  });

  const TYPE_COLOR: Record<string, string> = {
    disbursement: Colors.primary, repayment: Colors.success, topup_clearance: Colors.accent,
  };

  return (
    <ScreenLayout title="Customer Statement" showBack>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Client Search */}
        <View style={styles.searchCard}>
          <Text style={styles.searchLabel}>Search Client</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Type name or phone (min 2 chars)..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={v => { setSearch(v); setSelectedClient(null); }}
          />
          {loadingClients && <ActivityIndicator color={Colors.primary} style={{ marginTop: 8 }} />}
          {clients?.results?.map((c: any) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.clientOption, selectedClient?.id === c.id && styles.clientOptionActive]}
              onPress={() => { setSelectedClient(c); setSearch(`${c.firstname} ${c.lastname}`); }}
            >
              <Text style={styles.clientOptionText}>{c.firstname} {c.lastname} — {c.phonenumber}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedClient && loadingStatement && (
          <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
        )}

        {statement && (
          <>
            <View style={styles.clientCard}>
              <Text style={styles.clientName}>{statement.client.name}</Text>
              <Text style={styles.clientPhone}>{statement.client.phone}</Text>
            </View>

            {statement.loan_blocks?.map((block: any) => (
              <View key={block.loan_id} style={styles.block}>
                <Text style={styles.blockTitle}>Loan #{block.loan_id} — {block.loan_type}</Text>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { flex: 1.2 }]}>Date</Text>
                  <Text style={[styles.th, { flex: 2 }]}>Description</Text>
                  <Text style={[styles.th, { flex: 1.2, textAlign: 'right' }]}>Amount</Text>
                  <Text style={[styles.th, { flex: 1.2, textAlign: 'right' }]}>Balance</Text>
                </View>
                {block.rows.map((row: any, i: number) => (
                  <View key={i} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                    <Text style={[styles.td, { flex: 1.2 }]}>{row.date?.slice(0,10) || '—'}</Text>
                    <Text style={[styles.td, { flex: 2 }]} numberOfLines={1}>{row.description}</Text>
                    <Text style={[styles.td, { flex: 1.2, textAlign: 'right', color: TYPE_COLOR[row.type] || Colors.text }]}>
                      {row.paid_amount > 0 ? formatTZS(row.paid_amount) : row.loan_amount > 0 ? formatTZS(row.loan_amount) : '—'}
                    </Text>
                    <Text style={[styles.td, { flex: 1.2, textAlign: 'right', color: Colors.primary, fontWeight: '600' }]}>
                      {formatTZS(row.balance)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  searchCard: { backgroundColor: Colors.surface, margin: Spacing.base, borderRadius: Radius.lg, padding: Spacing.base, ...Shadow.sm },
  searchLabel: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.textSecondary, marginBottom: 8 },
  searchInput: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: Typography.sizes.sm, color: Colors.text },
  clientOption: { padding: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  clientOptionActive: { backgroundColor: Colors.primary + '10' },
  clientOptionText: { fontSize: Typography.sizes.sm, color: Colors.text },
  clientCard: { backgroundColor: Colors.primary, margin: Spacing.base, marginTop: 0, borderRadius: Radius.lg, padding: Spacing.base },
  clientName: { color: '#fff', fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold },
  clientPhone: { color: 'rgba(255,255,255,0.75)', fontSize: Typography.sizes.xs, marginTop: 2 },
  block: { backgroundColor: Colors.surface, margin: Spacing.base, marginTop: 0, borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.sm },
  blockTitle: { backgroundColor: Colors.primary + '10', padding: 10, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.primary },
  tableHeader: { flexDirection: 'row', backgroundColor: Colors.surfaceAlt, paddingHorizontal: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  th: { fontSize: 10, fontWeight: Typography.weights.bold, color: Colors.textSecondary, paddingHorizontal: 2 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tableRowAlt: { backgroundColor: Colors.surfaceAlt },
  td: { fontSize: 11, color: Colors.text, paddingHorizontal: 2 },
});
