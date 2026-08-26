// Office Transactions — list + add new transaction button
import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, ScrollView, TextInput, ActivityIndicator,
  RefreshControl, Dimensions,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { DateInput } from '@/components/ui/DateInput';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { OfficeTransactionService, BranchService } from '@/lib/services';
import { formatTZS, getTodayLocal } from '@/lib/format';

const TX_TYPES = ['Transfer', 'Loan Disbursement', 'Salary', 'Capital', 'Refund', 'Other'];
const TX_METHODS = [{ v: 'cash', l: '💵 Cash' }, { v: 'bank', l: '🏦 Bank' }];

function AddTransactionModal({ visible, onClose, onSuccess }: any) {
  const [form, setForm] = useState({
    office_from_id: '', office_to_id: '', amount: '',
    transaction_type: 'Transfer', transaction_method: 'bank',
    transaction_date: getTodayLocal(),
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const { data: offices } = useQuery({
    queryKey: ['offices-for-tx'],
    queryFn: BranchService.offices,
    enabled: visible,
  });

  const officeList: any[] = Array.isArray(offices) ? offices : [];

  const { mutate: createTx, isPending } = useMutation({
    mutationFn: () => OfficeTransactionService.create({
      office_from_id: form.office_from_id,
      office_to_id: form.office_to_id,
      amount: form.amount,
      transaction_type: form.transaction_type,
      transaction_method: form.transaction_method,
      transaction_date: form.transaction_date,
    }),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Transaction Created' });
      onSuccess();
      onClose();
      setForm({ office_from_id:'', office_to_id:'', amount:'', transaction_type:'Transfer', transaction_method:'bank', transaction_date: getTodayLocal() });
    },
    onError: (e: any) => {
      Toast.show({ type: 'error', text1: 'Failed', text2: e?.response?.data?.detail || e?.response?.data?.error || 'Error creating transaction.' });
    },
  });

  const OfficeSelector = ({ label, field }: { label: string; field: string }) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
        <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
          {officeList.map(o => {
            const active = (form as any)[field] === String(o.id);
            return (
              <TouchableOpacity
                key={o.id}
                style={[styles.officeChip, active && styles.officeChipActive]}
                onPress={() => set(field, String(o.id))}
              >
                <Text style={[styles.officeChipText, active && styles.officeChipTextActive]}>{o.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>New Office Transaction</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            <OfficeSelector label="From Office *" field="office_from_id" />
            <OfficeSelector label="To Office *" field="office_to_id" />

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Amount (TZS) *</Text>
              <TextInput
                style={styles.input}
                value={form.amount}
                onChangeText={v => set('amount', v)}
                placeholder="e.g. 500000"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Transaction Type</Text>
              <View style={styles.chipRow}>
                {TX_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.chip, form.transaction_type === t && styles.chipActive]}
                    onPress={() => set('transaction_type', t)}
                  >
                    <Text style={[styles.chipText, form.transaction_type === t && styles.chipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Payment Method</Text>
              <View style={styles.chipRow}>
                {TX_METHODS.map(m => (
                  <TouchableOpacity
                    key={m.v}
                    style={[styles.chip, form.transaction_method === m.v && styles.chipActive]}
                    onPress={() => set('transaction_method', m.v)}
                  >
                    <Text style={[styles.chipText, form.transaction_method === m.v && styles.chipTextActive]}>{m.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Transaction Date</Text>
              <DateInput
                value={form.transaction_date}
                onChange={v => set('transaction_date', v)}
                placeholder="Select date"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, isPending && { opacity: 0.7 }]}
              onPress={() => createTx()}
              disabled={isPending}
            >
              <Text style={styles.submitText}>{isPending ? 'Saving...' : '✓  Create Transaction'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function OfficeTransactionsScreen() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['office-transactions'],
    queryFn: OfficeTransactionService.list,
  });

  const items: any[] = Array.isArray(data) ? data : [];

  return (
    <ScreenLayout
      title="Office Transactions"
      subtitle="HQ"
      showBack
      rightAction={
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddOpen(true)}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      }
    >
      {isLoading
        ? <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
        : (
          <FlatList
            data={items}
            keyExtractor={i => String(i.id)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
            ListEmptyComponent={<Text style={styles.empty}>No transactions yet. Tap + to add.</Text>}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={styles.iconCircle}>
                  <Text style={{ fontSize: 18 }}>{item.transaction_method === 'bank' ? '🏦' : '💵'}</Text>
                </View>
                <View style={styles.rowLeft}>
                  <Text style={styles.fromTo}>{item.office_from} → {item.office_to}</Text>
                  <Text style={styles.txType}>{item.transaction_type} · {item.transaction_date}</Text>
                  <Text style={styles.by}>By: {item.processed_by}</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.amount}>{formatTZS(item.amount)}</Text>
                  <View style={[styles.methodBadge, { backgroundColor: item.transaction_method === 'bank' ? Colors.infoLight : Colors.successLight }]}>
                    <Text style={[styles.methodText, { color: item.transaction_method === 'bank' ? Colors.info : Colors.success }]}>
                      {item.transaction_method}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          />
        )}

      <AddTransactionModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['office-transactions'] })}
      />
    </ScreenLayout>
  );
}

const { height: H } = Dimensions.get('window');
const styles = StyleSheet.create({
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 22, lineHeight: 26 },
  list: { padding: Spacing.base, gap: Spacing.sm, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary + '12', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowLeft: { flex: 1 },
  fromTo: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.text },
  txType: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 2 },
  by: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.primary },
  methodBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  methodText: { fontSize: 10, fontWeight: Typography.weights.semibold, textTransform: 'capitalize' },
  empty: { textAlign: 'center', color: Colors.textMuted, padding: 40 },
  // Modal
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.overlay },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: H * 0.92 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sheetTitle: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.text },
  closeBtn: { fontSize: 18, color: Colors.textMuted, padding: 4 },
  sheetBody: { padding: Spacing.base },
  fieldGroup: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, color: Colors.textSecondary, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: Typography.sizes.base, color: Colors.text, backgroundColor: Colors.surfaceAlt },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, fontWeight: Typography.weights.medium },
  chipTextActive: { color: '#fff', fontWeight: Typography.weights.semibold },
  officeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
  officeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  officeChipText: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  officeChipTextActive: { color: '#fff', fontWeight: Typography.weights.semibold },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.sm, marginBottom: 30 },
  submitText: { color: '#fff', fontWeight: Typography.weights.bold, fontSize: Typography.sizes.base },
});
