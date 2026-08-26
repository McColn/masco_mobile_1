// Completed Customers (No Existing Loan) — mirrors no_loan_customers() web view
// Screenshot: S/N | Name (uppercase) | Check no | Contact
import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { useBranchStore } from '@/store/branchStore';
import api from '@/lib/api';

const TEAL = '#5bc0de';
const GOLD = '#c8a96e';
const NAVY = '#0d1b2e';

export default function CompletedCustomersScreen() {
  const { selectedBranch } = useBranchStore();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['no-loan-customers', selectedBranch?.id],
    queryFn: () => api.get('/no-loan-customers/').then(r => r.data),
  });

  const clients: any[] = data?.clients ?? [];
  const branchName = data?.branch_name ?? selectedBranch?.name?.toUpperCase() ?? '';

  return (
    <ScreenLayout title="Completed Customers" subtitle={selectedBranch?.name} showBack>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {isLoading && <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />}

        {data && (
          <>
            {/* Title block — matches screenshot exactly */}
            <Text style={s.branchTitle}>{branchName} BRANCH</Text>
            <Text style={s.reportTitle}>CUSTOMERS WITH NO EXISTING LOAN</Text>

            {/* Count badge */}
            <View style={s.countBadge}>
              <Text style={s.countText}>{clients.length} Customers</Text>
            </View>

            {clients.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyText}>No completed customers found.</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginHorizontal: Spacing.base }}>
                <View style={s.table}>
                  {/* Header */}
                  <View style={[s.row, s.thead]}>
                    <Text style={[s.cell, s.th, { width: 46, textAlign: 'center' }]}>S/N</Text>
                    <Text style={[s.cell, s.th, { width: 220 }]}>Name</Text>
                    <Text style={[s.cell, s.th, { width: 120 }]}>Check no</Text>
                    <Text style={[s.cell, s.th, { width: 120 }]}>Contact</Text>
                  </View>

                  {/* Data rows */}
                  {clients.map((c: any, i: number) => (
                    <View key={c.id ?? i} style={[s.row, i % 2 === 1 && s.rowAlt]}>
                      <Text style={[s.cell, { width: 46, textAlign: 'center', color: Colors.textMuted }]}>{c.sn}</Text>
                      <Text style={[s.cell, { width: 220, fontWeight: '500', letterSpacing: 0.2 }]}>{c.name}</Text>
                      <Text style={[s.cell, { width: 120, color: Colors.textSecondary }]}>{c.check_no}</Text>
                      <Text style={[s.cell, { width: 120, color: Colors.textSecondary }]}>{c.contact}</Text>
                    </View>
                  ))}

                  {/* Footer */}
                  <View style={[s.row, s.tfoot]}>
                    <Text style={[s.cell, s.tfootText, { width: 46 }]}> </Text>
                    <Text style={[s.cell, s.tfootText, { width: 220 }]}>Total: {clients.length} customers</Text>
                    <Text style={[s.cell, { width: 120 + 120 }]}> </Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  branchTitle:  { textAlign: 'center', fontSize: 13, fontWeight: '800', color: NAVY, marginTop: Spacing.sm },
  reportTitle:  { textAlign: 'center', fontSize: 12, fontWeight: '800', color: NAVY, textDecorationLine: 'underline', marginBottom: Spacing.xs, letterSpacing: 0.3 },
  countBadge:   { alignSelf: 'center', backgroundColor: Colors.primary + '15', borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 4, marginBottom: Spacing.sm },
  countText:    { fontSize: Typography.sizes.xs, color: Colors.primary, fontWeight: '600' },
  table:        { borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  row:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowAlt:       { backgroundColor: '#f8f9fa' },
  thead:        { backgroundColor: TEAL, borderBottomWidth: 2, borderBottomColor: '#4aa8c4' },
  tfoot:        { backgroundColor: GOLD, borderBottomWidth: 0 },
  cell:         { fontSize: 12, color: Colors.text, paddingHorizontal: 4 },
  th:           { color: '#fff', fontWeight: '700', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3 },
  tfootText:    { color: '#1a1a1a', fontWeight: '800', fontSize: 12 },
  emptyBox:     { padding: 40, alignItems: 'center' },
  emptyText:    { color: Colors.textMuted, fontSize: Typography.sizes.sm },
});
