import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, ScrollView,
  TextInput, Alert, Dimensions,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { OfficePickerModal } from '@/components/common/OfficePickerModal';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { StaffService } from '@/lib/services';
import { useOffices } from '@/hooks/useOffices';
import api from '@/lib/api';
import type { Office } from '@/lib/types';

const { height: H } = Dimensions.get('window');
const ROLES = ['Branch Manager', 'Loan Officer', 'Cashier', 'Accountant', 'Supervisor', 'Data Entry'];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function AddStaffModal({ visible, onClose, onSuccess }: any) {
  const { offices, isLoading: loadingOffices } = useOffices();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const [form, setForm] = useState({
    first_name:'', last_name:'', username:'', email:'',
    phone:'', password:'', role:'', salary:'', transaction_method:'bank',
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post('/staff/add/', {
      ...form,
      office_id: selectedOffice?.id,
    }),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Staff Registered', text2: `${form.first_name} ${form.last_name} added.` });
      onSuccess(); onClose();
      setForm({ first_name:'', last_name:'', username:'', email:'', phone:'', password:'', role:'', salary:'', transaction_method:'bank' });
      setSelectedOffice(null);
    },
    onError: (e: any) => {
      Toast.show({ type: 'error', text1: 'Failed', text2: e?.response?.data?.detail || JSON.stringify(e?.response?.data) || 'Registration failed.' });
    },
  });

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.modalRoot}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Register New Staff</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Field label="First Name *">
                <TextInput style={styles.input} value={form.first_name} onChangeText={v=>set('first_name',v)} placeholder="e.g. John" placeholderTextColor={Colors.textMuted} />
              </Field>
              <Field label="Last Name *">
                <TextInput style={styles.input} value={form.last_name} onChangeText={v=>set('last_name',v)} placeholder="e.g. Doe" placeholderTextColor={Colors.textMuted} />
              </Field>
              <Field label="Username *">
                <TextInput style={styles.input} value={form.username} onChangeText={v=>set('username',v)} placeholder="e.g. johndoe" placeholderTextColor={Colors.textMuted} autoCapitalize="none" />
              </Field>
              <Field label="Email">
                <TextInput style={styles.input} value={form.email} onChangeText={v=>set('email',v)} placeholder="john@example.com" placeholderTextColor={Colors.textMuted} keyboardType="email-address" autoCapitalize="none" />
              </Field>
              <Field label="Phone">
                <TextInput style={styles.input} value={form.phone} onChangeText={v=>set('phone',v)} placeholder="0712345678" placeholderTextColor={Colors.textMuted} keyboardType="phone-pad" />
              </Field>
              <Field label="Password *">
                <TextInput style={styles.input} value={form.password} onChangeText={v=>set('password',v)} placeholder="Set password" placeholderTextColor={Colors.textMuted} secureTextEntry autoCapitalize="none" />
              </Field>

              {/* ── Assign to Office ── */}
              <Field label="Assign to Office">
                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => setPickerOpen(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.pickerBtnIcon}>🏦</Text>
                  <Text style={[styles.pickerBtnText, !selectedOffice && styles.pickerBtnPlaceholder]}>
                    {selectedOffice ? selectedOffice.name : loadingOffices ? 'Loading offices...' : 'Select office (optional)'}
                  </Text>
                  <Text style={styles.pickerArrow}>▾</Text>
                </TouchableOpacity>
              </Field>

              {/* ── Role ── */}
              <Field label="Role">
                <View style={styles.chipRow}>
                  {ROLES.map(r => (
                    <TouchableOpacity key={r} style={[styles.chip, form.role===r && styles.chipActive]} onPress={() => set('role', r)}>
                      <Text style={[styles.chipText, form.role===r && styles.chipTextActive]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Field>

              <Field label="Basic Salary (TZS)">
                <TextInput style={styles.input} value={form.salary} onChangeText={v=>set('salary',v)} placeholder="e.g. 500000" placeholderTextColor={Colors.textMuted} keyboardType="numeric" />
              </Field>

              <Field label="Salary Method">
                <View style={styles.chipRow}>
                  {[{v:'bank',l:'Bank'},{v:'cash',l:'Cash'}].map(m => (
                    <TouchableOpacity key={m.v} style={[styles.chip, form.transaction_method===m.v && styles.chipActive]} onPress={() => set('transaction_method', m.v)}>
                      <Text style={[styles.chipText, form.transaction_method===m.v && styles.chipTextActive]}>{m.l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Field>

              <TouchableOpacity style={[styles.submitBtn, isPending && {opacity:0.7}]} onPress={() => mutate()} disabled={isPending}>
                <Text style={styles.submitText}>{isPending ? 'Registering...' : '✓  Register Staff'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Office picker — separate modal so it overlays the form */}
      <OfficePickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        offices={offices}
        isLoading={loadingOffices}
        selectedId={selectedOffice?.id}
        onSelect={(o) => setSelectedOffice(o)}
        title="Assign to Office"
      />
    </>
  );
}

export default function StaffScreen() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['staff'],
    queryFn: StaffService.list,
  });

  const { mutate: blockUser } = useMutation({
    mutationFn: ({ id, block }: { id: number; block: boolean }) =>
      api.post('/staff/block/', { user_id: id, block }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['staff'] });
      Toast.show({ type: 'success', text1: vars.block ? 'User Blocked' : 'User Unblocked' });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Action failed' }),
  });

  const confirmBlock = (item: any) => {
    const willBlock = item.is_active;
    Alert.alert(willBlock ? 'Block User' : 'Unblock User', `${willBlock ? 'Block' : 'Unblock'} ${item.full_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: willBlock ? 'Block' : 'Unblock', style: 'destructive', onPress: () => blockUser({ id: item.id, block: willBlock }) },
    ]);
  };

  const staff: any[] = Array.isArray(data) ? data : [];

  return (
    <ScreenLayout title="Register Staff" subtitle={`${staff.length} total`} showBack
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
            data={staff}
            keyExtractor={i => String(i.id)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
            ListEmptyComponent={<Text style={styles.empty}>No staff found. Tap + to add.</Text>}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: item.is_active ? Colors.primary+'18' : Colors.errorLight }]}>
                  <Text style={[styles.avatarText, { color: item.is_active ? Colors.primary : Colors.error }]}>
                    {item.full_name?.split(' ').map((n:string)=>n[0]).join('').slice(0,2)||'??'}
                  </Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.full_name}</Text>
                  <Text style={styles.sub}>{item.role || 'Staff'} · {item.office || '—'}</Text>
                  <Text style={styles.contact}>{item.phone || item.email || '—'}</Text>
                </View>
                <View style={styles.rowRight}>
                  <View style={[styles.statusBadge, { backgroundColor: item.is_active ? Colors.successLight : Colors.errorLight }]}>
                    <Text style={[styles.statusText, { color: item.is_active ? Colors.success : Colors.error }]}>
                      {item.is_active ? 'Active' : 'Blocked'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: item.is_active ? Colors.errorLight : Colors.successLight }]}
                    onPress={() => confirmBlock(item)}
                  >
                    <Text style={[styles.actionBtnText, { color: item.is_active ? Colors.error : Colors.success }]}>
                      {item.is_active ? 'Block' : 'Unblock'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      <AddStaffModal visible={addOpen} onClose={() => setAddOpen(false)} onSuccess={() => qc.invalidateQueries({ queryKey: ['staff'] })} />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 22, lineHeight: 26 },
  list: { padding: Spacing.base, gap: Spacing.sm, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontWeight: '700', fontSize: 14 },
  info: { flex: 1 },
  name: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.text },
  sub: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 1 },
  contact: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  rowRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  statusText: { fontSize: 10, fontWeight: Typography.weights.bold },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  actionBtnText: { fontSize: 10, fontWeight: Typography.weights.bold },
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
  pickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: Colors.surfaceAlt },
  pickerBtnIcon: { fontSize: 16 },
  pickerBtnText: { flex: 1, fontSize: Typography.sizes.base, color: Colors.text },
  pickerBtnPlaceholder: { color: Colors.textMuted },
  pickerArrow: { color: Colors.textMuted, fontSize: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, fontWeight: Typography.weights.medium },
  chipTextActive: { color: '#fff', fontWeight: Typography.weights.semibold },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.md, marginBottom: 30 },
  submitText: { color: '#fff', fontWeight: Typography.weights.bold, fontSize: Typography.sizes.base },
});
