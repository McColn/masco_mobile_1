import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, ScrollView, TextInput, ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { DateInput } from '@/components/ui/DateInput';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { useOffices } from '@/hooks/useOffices';
import api from '@/lib/api';

const { height: H } = Dimensions.get('window');

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function AddOfficeModal({ visible, onClose, onSuccess }: any) {
  const [form, setForm] = useState({ name:'', region:'', district:'', ward:'', street:'', founded_date:'' });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post('/offices/add/', form),
    onSuccess: (res: any) => {
      Toast.show({ type: 'success', text1: 'Office Registered', text2: `${form.name} created.` });
      onSuccess();
      onClose();
      setForm({ name:'', region:'', district:'', ward:'', street:'', founded_date:'' });
    },
    onError: (e: any) => {
      // Extract the actual error from any response shape
      const data = e?.response?.data;
      const msg  = data?.detail
        ?? data?.name?.[0]
        ?? (typeof data === 'string' ? data : null)
        ?? (data && typeof data === 'object' ? JSON.stringify(data) : null)
        ?? e?.message
        ?? 'Failed to register office.';
      console.error('[OFFICE ADD]', e?.response?.status, JSON.stringify(data));
      Toast.show({ type: 'error', text1: 'Registration Failed', text2: msg, visibilityTime: 6000 });
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Register New Office</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Field label="Office Name *">
              <TextInput style={styles.input} value={form.name} onChangeText={v=>set('name',v)} placeholder="e.g. Kariakoo Branch" placeholderTextColor={Colors.textMuted} />
            </Field>
            <Field label="Region *">
              <TextInput style={styles.input} value={form.region} onChangeText={v=>set('region',v)} placeholder="e.g. Dar es Salaam" placeholderTextColor={Colors.textMuted} />
            </Field>
            <Field label="District *">
              <TextInput style={styles.input} value={form.district} onChangeText={v=>set('district',v)} placeholder="e.g. Ilala" placeholderTextColor={Colors.textMuted} />
            </Field>
            <Field label="Ward">
              <TextInput style={styles.input} value={form.ward} onChangeText={v=>set('ward',v)} placeholder="e.g. Kariakoo" placeholderTextColor={Colors.textMuted} />
            </Field>
            <Field label="Street">
              <TextInput style={styles.input} value={form.street} onChangeText={v=>set('street',v)} placeholder="e.g. Msimbazi Street" placeholderTextColor={Colors.textMuted} />
            </Field>
            <Field label="Founded Date">
              <DateInput value={form.founded_date} onChange={(v:string)=>set('founded_date',v)} placeholder="Select date" />
            </Field>

            {/* Validation hint */}
            {!form.name.trim() && (
              <Text style={styles.hint}>⚠ Office name is required</Text>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, (!form.name.trim() || isPending) && { opacity: 0.6 }]}
              onPress={() => mutate()}
              disabled={!form.name.trim() || isPending}
            >
              <Text style={styles.submitText}>{isPending ? 'Registering...' : '✓  Register Office'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function OfficeAccountScreen() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const { offices, isLoading, refetch } = useOffices();

  const hqCount     = offices.filter(o => o.name?.toUpperCase() === 'HQ').length;
  const branchCount = offices.length - hqCount;

  return (
    <ScreenLayout
      title="Office Accounts"
      subtitle={`${offices.length} offices`}
      showBack
      rightAction={
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddOpen(true)}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.statsBanner}>
        <View style={styles.statItem}><Text style={styles.statValue}>{offices.length}</Text><Text style={styles.statLabel}>Total</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}><Text style={[styles.statValue,{color:Colors.teal}]}>{branchCount}</Text><Text style={styles.statLabel}>Branches</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}><Text style={[styles.statValue,{color:Colors.accent}]}>{hqCount}</Text><Text style={styles.statLabel}>HQ</Text></View>
      </View>

      {isLoading
        ? <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
        : (
          <FlatList
            data={offices}
            keyExtractor={i => String(i.id)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={Colors.primary} />}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={{ fontSize: 40 }}>🏢</Text>
                <Text style={styles.emptyTitle}>No Offices Yet</Text>
                <Text style={styles.emptyText}>Tap + to register the first office.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={[styles.iconCircle, { backgroundColor: item.name?.toUpperCase()==='HQ' ? Colors.accent+'20' : Colors.primary+'12' }]}>
                  <Text style={{ fontSize: 20 }}>🏢</Text>
                </View>
                <View style={styles.info}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    {item.name?.toUpperCase() === 'HQ' && (
                      <View style={styles.hqBadge}><Text style={styles.hqBadgeText}>HQ</Text></View>
                    )}
                  </View>
                  <Text style={styles.sub}>{[item.district, item.region].filter(Boolean).join(', ') || '—'}</Text>
                  {item.founded_date && <Text style={styles.meta}>Founded: {item.founded_date}</Text>}
                </View>
                <View style={styles.idBadge}><Text style={styles.idText}>#{item.id}</Text></View>
              </View>
            )}
          />
        )}

      <AddOfficeModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['offices-list'] })}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 22, lineHeight: 26 },
  statsBanner: { flexDirection: 'row', backgroundColor: Colors.surface, margin: Spacing.base, marginBottom: Spacing.sm, borderRadius: Radius.lg, ...Shadow.sm, overflow: 'hidden' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statDivider: { width: 1, backgroundColor: Colors.border },
  statValue: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.primary },
  statLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 2 },
  list: { padding: Spacing.base, gap: Spacing.sm, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  info: { flex: 1 },
  name: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.text },
  sub: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 1 },
  meta: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  hqBadge: { backgroundColor: Colors.accent+'20', borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  hqBadgeText: { fontSize: 9, color: Colors.accent, fontWeight: Typography.weights.bold },
  idBadge: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border },
  idText: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, fontWeight: Typography.weights.semibold },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyTitle: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.text },
  emptyText: { fontSize: Typography.sizes.sm, color: Colors.textMuted },
  // Modal
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.overlay },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: H * 0.88 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sheetTitle: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.text },
  closeBtn: { fontSize: 18, color: Colors.textMuted, padding: 4 },
  sheetBody: { padding: Spacing.base },
  fieldGroup: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, color: Colors.textSecondary, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: Typography.sizes.base, color: Colors.text, backgroundColor: Colors.surfaceAlt },
  hint: { fontSize: Typography.sizes.xs, color: Colors.error, marginBottom: Spacing.sm },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.sm, marginBottom: 30 },
  submitText: { color: '#fff', fontWeight: Typography.weights.bold, fontSize: Typography.sizes.base },
});
