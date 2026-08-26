import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { StatsBanner } from '@/components/ui/StatsBanner';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { NyongezaService } from '@/lib/services';
import { formatTZS, formatDate } from '@/lib/format';

export default function NyongezaScreen() {
  const [addOpen, setAddOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [desc, setDesc] = useState('');
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['nyongeza'],
    queryFn: NyongezaService.list,
  });

  const { mutate: add, isPending } = useMutation({
    mutationFn: () => NyongezaService.create({ amount, deposit_method: method, description: desc }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nyongeza'] });
      Toast.show({ type: 'success', text1: 'Capital Added' });
      setAddOpen(false); setAmount(''); setDesc('');
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: 'Failed', text2: e?.response?.data?.detail || 'Error' }),
  });

  const items: any[] = data?.nyongeza ?? [];

  return (
    <ScreenLayout title="Capital (Nyongeza)" showBack
      rightAction={
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddOpen(true)}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      }
    >
      <StatsBanner stats={[
        { label: 'Bank', value: formatTZS(data?.total_bank ?? 0), color: Colors.info },
        { label: 'Cash', value: formatTZS(data?.total_cash ?? 0), color: Colors.success },
        { label: 'Total', value: formatTZS(data?.total_all ?? 0), color: Colors.primary },
      ]} />
      {isLoading ? <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={items}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={styles.list}
          onRefresh={refetch} refreshing={isRefetching}
          ListEmptyComponent={<Text style={styles.empty}>No capital deposits recorded.</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={[styles.methodBadge, { backgroundColor: item.deposit_method === 'bank' ? Colors.infoLight : Colors.successLight }]}>
                <Text style={{ fontSize: 16 }}>{item.deposit_method === 'bank' ? '🏦' : '💵'}</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowDesc} numberOfLines={1}>{item.description || 'Capital Deposit'}</Text>
                <Text style={styles.rowMeta}>{item.office} · {item.date}</Text>
              </View>
              <Text style={styles.rowAmt}>{formatTZS(item.amount)}</Text>
            </View>
          )}
        />
      )}

      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Capital</Text>
              <TouchableOpacity onPress={() => setAddOpen(false)}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView style={{ padding: Spacing.base }}>
              <Text style={styles.fieldLabel}>Amount (TZS)</Text>
              <TextInput style={styles.fieldInput} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="Enter amount" placeholderTextColor={Colors.textMuted} />
              <Text style={styles.fieldLabel}>Deposit Method</Text>
              <View style={styles.chipRow}>
                {[{v:'cash',l:'💵 Cash'},{v:'bank',l:'🏦 Bank'}].map(m => (
                  <TouchableOpacity key={m.v} style={[styles.chip, method === m.v && styles.chipActive]} onPress={() => setMethod(m.v)}>
                    <Text style={[styles.chipText, method === m.v && styles.chipTextActive]}>{m.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Description (optional)</Text>
              <TextInput style={styles.fieldInput} value={desc} onChangeText={setDesc} placeholder="e.g. Monthly capital injection" placeholderTextColor={Colors.textMuted} multiline />
              <TouchableOpacity style={[styles.submitBtn, isPending && {opacity:0.7}]} onPress={() => add()} disabled={isPending}>
                <Text style={styles.submitText}>{isPending ? 'Saving...' : '✓  Add Capital'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 22, lineHeight: 26 },
  list: { padding: Spacing.base, gap: Spacing.sm, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  methodBadge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1 },
  rowDesc: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.text },
  rowMeta: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 1 },
  rowAmt: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.success },
  empty: { textAlign: 'center', color: Colors.textMuted, padding: 40 },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.text },
  closeBtn: { fontSize: 18, color: Colors.textMuted, padding: 4 },
  fieldLabel: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, color: Colors.textSecondary, marginTop: 14, marginBottom: 6 },
  fieldInput: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: Typography.sizes.base, color: Colors.text, backgroundColor: Colors.surfaceAlt },
  chipRow: { flexDirection: 'row', gap: Spacing.sm },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: Typography.weights.semibold },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center', marginTop: 20, marginBottom: 30 },
  submitText: { color: '#fff', fontWeight: Typography.weights.bold, fontSize: Typography.sizes.base },
});
