// Payment Receipts (Loan Receipt List)
// Matches web image: customer selector → list of repayments with
// clickable receipt numbers and delete action. Tapping a receipt navigates
// to the printable receipt page.
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { useDebounce } from '@/hooks/useDebounce';
import { LoanService } from '@/lib/services';

const TEAL   = '#5bc0de';
const NAVY   = '#0d4a7a';
const BLUE   = '#3b82f6';
const RED    = '#dc2626';

function fmtN(v: any): string {
  const n = Number(v) || 0;
  return Math.round(n).toLocaleString('en-US');
}
function fmtDate(iso: string): string {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

// ── Client Picker Modal ─────────────────────────────────────────────────
function ClientPickerModal({
  visible, onClose, onSelect,
}: { visible: boolean; onClose: () => void; onSelect: (c: any) => void }) {
  const [q, setQ] = useState('');
  const debounced = useDebounce(q, 250);
  const { data, isLoading } = useQuery({
    queryKey: ['receipt-clients', debounced],
    queryFn:  () => LoanService.receiptClients({ search: debounced }),
    enabled:  visible,
  });
  const clients: any[] = data?.results ?? [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ps.pickerRoot}>
        <TouchableOpacity style={ps.pickerOverlay} activeOpacity={1} onPress={onClose} />
        <View style={ps.pickerSheet}>
          <View style={ps.pickerHeader}>
            <Text style={ps.pickerTitle}>Select Customer</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 18, color: Colors.textMuted }}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
            <TextInput
              style={ps.searchInput}
              placeholder="Search by name, phone, check no…"
              value={q} onChangeText={setQ}
              placeholderTextColor={Colors.textMuted} autoCapitalize="none"
            />
          </View>
          {isLoading ? (
            <ActivityIndicator color={Colors.primary} size="large" style={{ margin: 40 }} />
          ) : (
            <FlatList
              data={clients}
              keyExtractor={c => String(c.client_id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={ps.clientRow}
                  onPress={() => { onSelect(item); onClose(); }}
                >
                  <Text style={ps.clientName} numberOfLines={1}>{item.display_label}</Text>
                  {item.phone ? <Text style={ps.clientMeta}>{item.phone}</Text> : null}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ color: Colors.textMuted, textAlign: 'center', padding: 40 }}>
                  {q ? `No matches for "${q}"` : 'No customers with repayments.'}
                </Text>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────
export default function PaymentReceiptsScreen() {
  const [client, setClient] = useState<any>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['receipt-list', client?.client_id],
    queryFn:  () => LoanService.receiptList({ client_id: client!.client_id }),
    enabled:  !!client?.client_id,
  });

  const rows: any[] = data?.rows ?? [];

  const { mutate: deleteRow, isPending: isDeleting } = useMutation({
    mutationFn: (id: number) => LoanService.deleteRepayment(id),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Receipt deleted', text2: 'Loan balance recalculated.' });
      setDeleteConfirm(null);
      refetch();
      qc.invalidateQueries({ queryKey: ['customer-report'] });
      qc.invalidateQueries({ queryKey: ['customer-loans-branch'] });
      qc.invalidateQueries({ queryKey: ['loan-schedule'] });
    },
    onError: (e: any) => {
      setDeleteConfirm(null);
      Toast.show({
        type: 'error',
        text1: 'Delete failed',
        text2: e?.response?.data?.error ?? e?.response?.data?.detail ?? 'Please try again.',
        visibilityTime: 5000,
      });
    },
  });

  return (
    <ScreenLayout title="Customer Loan Payment Receipt" showBack>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Customer picker card */}
        <View style={s.pickerCard}>
          <Text style={s.pickerLabel}>Customer Name</Text>
          <TouchableOpacity style={s.pickerBox} onPress={() => setPickerOpen(true)}>
            <Text style={[s.pickerBoxText, !client && { color: Colors.textMuted }]} numberOfLines={1}>
              {client?.display_label ?? 'Tap to select a customer…'}
            </Text>
            <Text style={{ fontSize: 16, color: Colors.textMuted }}>▼</Text>
          </TouchableOpacity>
          {client && data && (
            <Text style={s.metaLine}>
              Check No: <Text style={s.bold}>{data.check_no || '—'}</Text>
              {'   '}Branch: <Text style={s.bold}>{data.branch_name || '—'}</Text>
            </Text>
          )}
        </View>

        {isLoading && <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />}

        {/* Receipts — one card per repayment, matches mobile UX better than the
            web's tight horizontal-scroll table. The receipt number is rendered
            as a big pressable pill button so it's obviously tappable and cannot
            be swallowed by any parent gesture handler. */}
        {data && !isLoading && (
          <View style={{ marginHorizontal: Spacing.base }}>
            {rows.length === 0 ? (
              <Text style={{ color: Colors.textMuted, textAlign: 'center', padding: 40 }}>
                No payments yet for this customer.
              </Text>
            ) : rows.map((r) => (
              <View key={r.id} style={s.card}>
                {/* Top: SN + date + amount + delete */}
                <View style={s.cardTop}>
                  <View style={s.snCircle}>
                    <Text style={s.snCircleText}>{r.sn}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardDate}>{fmtDate(r.date)}</Text>
                    <Text style={s.cardDesc} numberOfLines={1}>{r.description}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.cardAmount}>{fmtN(r.amount)} /=</Text>
                  </View>
                  <TouchableOpacity
                    style={s.deleteIcon}
                    onPress={() => setDeleteConfirm(r)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={{ fontSize: 15, color: RED }}>🗑</Text>
                  </TouchableOpacity>
                </View>

                {/* Bottom: receipt-number button, unmistakably tappable */}
                <TouchableOpacity
                  style={s.receiptBtn}
                  onPress={() => {
                    // Extra guard: if the API somehow returned no id, don't
                    // navigate — but still show a toast so it's not silent.
                    if (!r.id) {
                      Toast.show({ type: 'error', text1: 'This payment has no receipt id yet.' });
                      return;
                    }
                    router.push(`/receipts/${r.id}` as any);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={s.receiptBtnLabel}>Receipt #</Text>
                  <Text style={s.receiptBtnNumber}>{r.receipt_number}</Text>
                  <Text style={s.receiptBtnArrow}>›</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Total summary */}
            {rows.length > 0 && (
              <View style={s.totalCard}>
                <Text style={s.totalLabel}>Total Payments</Text>
                <Text style={s.totalValue}>{fmtN(data.total_amount)} /=</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Client picker */}
      <ClientPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={c => setClient(c)}
      />

      {/* Delete confirmation */}
      <Modal
        visible={!!deleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setDeleteConfirm(null)}
      >
        <View style={dc.overlay}>
          <View style={dc.box}>
            <View style={dc.header}>
              <Text style={dc.headerText}>⚠ Delete Payment</Text>
            </View>
            <View style={dc.body}>
              <Text style={dc.title}>Delete receipt #{deleteConfirm?.receipt_number}?</Text>
              <Text style={dc.desc}>
                Amount: <Text style={dc.bold}>{fmtN(deleteConfirm?.amount)} /=</Text>{'\n'}
                Date: <Text style={dc.bold}>{fmtDate(deleteConfirm?.date)}</Text>
              </Text>
              <Text style={dc.notice}>
                ℹ The loan's remaining balance will be recalculated after removal.
              </Text>
            </View>
            <View style={dc.footer}>
              <TouchableOpacity style={dc.cancelBtn}
                onPress={() => !isDeleting && setDeleteConfirm(null)}
                disabled={isDeleting}>
                <Text style={dc.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={dc.goBtn}
                onPress={() => deleteConfirm && deleteRow(deleteConfirm.id)}
                disabled={isDeleting}>
                {isDeleting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={dc.goText}>🗑 Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  pickerCard: {
    backgroundColor: Colors.surface, margin: Spacing.base, borderRadius: Radius.md,
    padding: Spacing.base, ...Shadow.sm,
  },
  pickerLabel: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  pickerBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  pickerBoxText: { flex: 1, fontSize: 13, color: Colors.text, fontWeight: '500' },
  metaLine: { fontSize: 12, color: Colors.textSecondary, marginTop: 10 },
  bold: { fontWeight: '700', color: NAVY, textDecorationLine: 'underline' },

  // Per-receipt card — replaces the horizontal-scroll table so touch
  // targets stay big and the receipt-number button is impossible to miss.
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.base, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  snCircle: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#e0f2fe',
    alignItems: 'center', justifyContent: 'center',
  },
  snCircleText: { color: BLUE, fontWeight: '800', fontSize: 13 },
  cardDate: { fontSize: 13, fontWeight: '600', color: Colors.text },
  cardDesc: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  cardAmount: { fontSize: 14, fontWeight: '800', color: Colors.text },
  deleteIcon: { padding: 4, marginLeft: 4 },

  // Receipt-number button — big, obvious, and unmistakably tappable.
  receiptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#eff6ff', borderWidth: 1, borderColor: BLUE,
    borderRadius: Radius.md, marginTop: 10,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  receiptBtnLabel:  { fontSize: 11, fontWeight: '700', color: BLUE, textTransform: 'uppercase', letterSpacing: 0.4 },
  receiptBtnNumber: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '800', color: BLUE, letterSpacing: 0.5 },
  receiptBtnArrow:  { fontSize: 20, color: BLUE, fontWeight: '700' },

  // Total footer card
  totalCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: NAVY, borderRadius: Radius.md,
    paddingHorizontal: 16, paddingVertical: 14, marginTop: 6,
  },
  totalLabel: { color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 0.3 },
  totalValue: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

const ps = StyleSheet.create({
  pickerRoot: { flex: 1, justifyContent: 'flex-end' },
  pickerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%' },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  pickerTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  searchInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: Colors.text, backgroundColor: '#fff',
  },
  clientRow: { padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  clientName: { fontSize: 13, fontWeight: '600', color: Colors.text },
  clientMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
});

const dc = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  box: { backgroundColor: '#fff', borderRadius: 12, width: '100%', maxWidth: 380, overflow: 'hidden' },
  header: { backgroundColor: RED, paddingVertical: 12, paddingHorizontal: 16 },
  headerText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  body: { padding: 20 },
  title: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 8, textAlign: 'center' },
  desc: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginBottom: 12, lineHeight: 18 },
  bold: { color: Colors.text, fontWeight: '700' },
  notice: { fontSize: 11, color: '#7f1d1d', backgroundColor: '#fef2f2', padding: 10, borderRadius: 6, textAlign: 'center' },
  footer: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border },
  cancelBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#f1f5f9' },
  cancelText: { color: Colors.text, fontWeight: '600', fontSize: 13 },
  goBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: RED },
  goText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
