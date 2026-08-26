// Branch Money Transfer (Bank & Cash Transfer) — mirrors bank_cash_transfer_report() web view
// Screenshot: Date | Receipt # | Name | Description | Amount | Processed By | Action (Delete)
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { useBranchStore } from '@/store/branchStore';
import api from '@/lib/api';
import { getTodayLocal } from '@/lib/format';

const NAVY = '#0d1b2e';
const GOLD = '#c8a96e';

function fmtN(v: any): string {
  return Math.round(Number(v) || 0).toLocaleString('en-US');
}

export default function MoneyTransferScreen() {
  const today = getTodayLocal();
  const [dateFrom, setDateFrom] = useState(today.slice(0, 7) + '-01');
  const [dateTo,   setDateTo]   = useState(today);
  const [search,   setSearch]   = useState<any>(null);
  const { selectedBranch } = useBranchStore();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['money-transfer', selectedBranch?.id, search],
    queryFn: () => api.get('/bank-cash-transaction-statement/', {
      params: { date_from: search.from, date_to: search.to },
    }).then(r => r.data),
    enabled: !!search,
  });

  const { mutate: deleteRow, isPending: deleting } = useMutation({
    mutationFn: (txnId: number) =>
      api.post(`/bank-cash-transaction/${txnId}/delete/`).then(r => r.data),
    onSuccess: (res: any) => {
      Toast.show({ type: 'success', text1: 'Deleted', text2: res.message });
      qc.invalidateQueries({ queryKey: ['money-transfer'] });
    },
    onError: (e: any) => {
      Toast.show({ type: 'error', text1: 'Delete Failed',
        text2: e?.response?.data?.detail ?? e?.message ?? 'Failed.' });
    },
  });

  const confirmDelete = (txnId: number, receiptNo: string) => {
    Alert.alert(
      'Delete Transaction',
      `Delete transaction #${receiptNo}? This will reverse the balance changes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteRow(txnId) },
      ]
    );
  };

  const rows: any[]  = data?.rows ?? [];
  const grandTotal   = Number(data?.grand_total ?? 0);
  const branchName   = data?.branch_name ?? selectedBranch?.name?.toUpperCase() ?? '';
  const fmt = (d: string) => d?.split('-').reverse().join('/') ?? '';

  return (
    <ScreenLayout title="Bank & Cash Transfer" subtitle={selectedBranch?.name} showBack>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <DateRangePicker
          dateFrom={dateFrom} dateTo={dateTo}
          onChangeDateFrom={setDateFrom} onChangeDateTo={setDateTo}
          onSearch={() => setSearch({ from: dateFrom, to: dateTo })}
          loading={isLoading}
        />

        {isLoading && <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />}

        {data && (
          <>
            {/* Title matching screenshot exactly */}
            <Text style={s.reportTitle}>
              BANK &amp; CASH TRANSFER FROM {fmt(data.date_from)} TO {fmt(data.date_to)}
            </Text>
            <Text style={s.branchLabel}>BRANCH: {branchName}</Text>

            {rows.length === 0 && (
              <View style={s.emptyBox}>
                <Text style={s.emptyText}>No cash/bank transfers in this period.</Text>
              </View>
            )}

            {rows.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginHorizontal: Spacing.base }}>
                <View style={s.table}>
                  {/* Header — matches screenshot columns */}
                  <View style={[s.row, s.thead]}>
                    {['Date','Receipt #','Name','Description','Amount','Processed By','Action'].map(h => (
                      <Text key={h} style={[s.cell, s.theadText,
                        h === 'Date'         ? { width: 90  } :
                        h === 'Receipt #'    ? { width: 75  } :
                        h === 'Name'         ? { width: 110 } :
                        h === 'Description'  ? { width: 160 } :
                        h === 'Amount'       ? { width: 100, textAlign: 'right' } :
                        h === 'Processed By' ? { width: 130 } :
                        { width: 90, textAlign: 'center' }]}>{h}</Text>
                    ))}
                  </View>

                  {/* Data rows */}
                  {rows.map((r: any, i: number) => (
                    <View key={r.txn_id ?? i} style={[s.row, i % 2 === 1 && s.rowAlt]}>
                      <Text style={[s.cell, { width: 90, color: Colors.textSecondary }]}>
                        {r.date?.split('-').reverse().join('/')}
                      </Text>
                      <Text style={[s.cell, { width: 75, color: Colors.primary }]}>{r.receipt_no}</Text>
                      <Text style={[s.cell, { width: 110, fontWeight: '600' }]} numberOfLines={1}>{r.name}</Text>
                      <Text style={[s.cell, { width: 160, color: Colors.textSecondary }]} numberOfLines={1}>
                        {r.description}
                      </Text>
                      <Text style={[s.cell, { width: 100, textAlign: 'right', fontWeight: '700' }]}>
                        {fmtN(r.amount)}
                      </Text>
                      <Text style={[s.cell, { width: 130, color: Colors.textMuted }]} numberOfLines={1}>
                        {r.processed_by}
                      </Text>
                      {/* Delete button — red, matching web screenshot */}
                      <View style={[s.cell, { width: 90, alignItems: 'center', justifyContent: 'center' }]}>
                        <TouchableOpacity
                          style={s.deleteBtn}
                          onPress={() => confirmDelete(r.txn_id, r.receipt_no)}
                          disabled={deleting}>
                          <Text style={s.deleteBtnText}>✕ Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  {/* Grand Total footer — matches screenshot */}
                  <View style={[s.row, s.tfoot]}>
                    <Text style={[s.cell, s.tfootText, { width: 90 + 75 + 110 + 160 }]}>Grand Total</Text>
                    <Text style={[s.cell, s.tfootText, { width: 100, textAlign: 'right' }]}>{fmtN(grandTotal)}</Text>
                    <Text style={[s.cell, { width: 130 + 90 }]}> </Text>
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
  reportTitle: {
    textAlign: 'center', fontSize: 12, fontWeight: '800',
    color: NAVY, textDecorationLine: 'underline',
    marginTop: Spacing.sm, marginHorizontal: Spacing.base, letterSpacing: 0.3,
  },
  branchLabel: {
    textAlign: 'center', fontSize: 12, fontWeight: '700',
    color: '#1a4fa0', marginBottom: Spacing.sm,
  },
  table: { borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 6,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowAlt:    { backgroundColor: '#f8f9fa' },
  thead:     { backgroundColor: NAVY, borderBottomWidth: 0 },
  tfoot:     { backgroundColor: GOLD, borderBottomWidth: 0 },
  cell:      { fontSize: 11, color: Colors.text, paddingHorizontal: 4 },
  theadText: { color: '#fff', fontWeight: '700', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3 },
  tfootText: { color: '#1a1a1a', fontWeight: '800', fontSize: 11 },
  deleteBtn: {
    backgroundColor: '#e74c3c', borderRadius: 3,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#c0392b',
  },
  deleteBtnText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  emptyBox:  { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
});
