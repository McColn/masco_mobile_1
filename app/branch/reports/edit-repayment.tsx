// Edit Monthly Repayment — mirrors edit_repayment() web view (screenshot 2)
// Fields: Name (read-only), Receipt No (read-only), Amount (read-only),
//   Repayment Mode (dropdown), Payment Month (date), Transaction Date (date)
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import api from '@/lib/api';
import { DateInput } from '@/components/ui/DateInput';

const PURPLE = '#9b59b6';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.formRow}>
      <Text style={s.formLabel}>{label}</Text>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

export default function EditRepaymentScreen() {
  const { type, id }   = useLocalSearchParams<{ type: string; id: string }>();
  const router         = useRouter();
  const qc             = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['edit-repayment', type, id],
    queryFn: () => api.get(`/repayment/${type}/${id}/edit/`).then(r => r.data),
    enabled: !!type && !!id,
  });

  const [method,        setMethod]        = useState('cash');
  const [paymentMonth,  setPaymentMonth]  = useState('');
  const [txnDate,       setTxnDate]       = useState('');

  useEffect(() => {
    if (data) {
      setMethod(data.transaction_method || 'cash');
      setPaymentMonth(data.payment_month || '');
      setTxnDate(data.repayment_date || '');
    }
  }, [data]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => api.post(`/repayment/${type}/${id}/edit/`, {
      transaction_method: method,
      payment_month:      paymentMonth,
      transaction_date:   txnDate,
    }).then(r => r.data),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Updated', text2: 'Record updated successfully.' });
      qc.invalidateQueries({ queryKey: ['monthly-repayment'] });
      router.back();
    },
    onError: (e: any) => {
      Toast.show({ type: 'error', text1: 'Error', text2: e?.response?.data?.detail ?? 'Update failed.' });
    },
  });

  return (
    <ScreenLayout title="Edit Monthly Repayment" showBack>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {isLoading && <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 60 }} />}

        {data && (
          <View style={s.card}>
            <Text style={s.cardTitle}>EDITING MONTHLY REPAYMENT</Text>
            <View style={s.divider} />

            {/* Name — read-only */}
            <Row label="Name">
              <View style={s.readOnly}>
                <Text style={s.readOnlyText}>{data.name}</Text>
              </View>
            </Row>

            {/* Receipt No — read-only */}
            <Row label="Receipt No">
              <View style={s.readOnly}>
                <Text style={s.readOnlyText}>{data.receipt_no}</Text>
              </View>
            </Row>

            {/* Amount — read-only */}
            <Row label="Amount">
              <View style={s.readOnly}>
                <Text style={s.readOnlyText}>{Math.round(Number(data.amount)||0).toLocaleString('en-US')}</Text>
              </View>
            </Row>

            {/* Repayment Mode — dropdown */}
            <Row label="Repayment Mode">
              <View style={s.pickerRow}>
                {['cash','bank'].map(m => (
                  <TouchableOpacity key={m} style={[s.modeChip, method === m && s.modeChipActive]} onPress={() => setMethod(m)}>
                    <Text style={[s.modeChipText, method === m && s.modeChipTextActive]}>{m.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Row>

            {/* Payment Month */}
            <Row label="Payment Month">
              <DateInput value={paymentMonth} onChange={setPaymentMonth} style={s.input} />
            </Row>

            {/* Transaction Date */}
            <Row label="Transaction Date">
              <DateInput value={txnDate} onChange={setTxnDate} style={s.input} />
            </Row>

            {/* Continue button — purple like web */}
            <TouchableOpacity style={[s.continueBtn, isPending && { opacity: 0.6 }]}
              onPress={() => save()} disabled={isPending}>
              {isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.continueBtnText}>✓  CONTINUE &gt;&gt;</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  card: { margin: Spacing.base, backgroundColor: '#fff', borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.base, elevation: 3, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a', letterSpacing: 0.3 },
  divider:   { height: 1.5, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  formRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 },
  formLabel: { width: 140, fontSize: 13, color: '#333', flexShrink: 0 },
  readOnly:  { flex: 1, backgroundColor: '#f0f0f0', borderRadius: Radius.sm, borderWidth: 1, borderColor: '#ddd', paddingHorizontal: 12, paddingVertical: 9 },
  readOnlyText: { fontSize: 13, color: '#555' },
  input:     { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: Colors.text, backgroundColor: '#fff' },
  pickerRow: { flexDirection: 'row', gap: 8 },
  modeChip:  { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.sm, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: '#f5f5f5' },
  modeChipActive: { backgroundColor: '#f0e6f6', borderColor: PURPLE },
  modeChipText: { fontSize: 12, color: '#333', fontWeight: '600' },
  modeChipTextActive: { color: PURPLE, fontWeight: '700' },
  continueBtn:     { backgroundColor: PURPLE, borderRadius: Radius.md, paddingVertical: 13, alignItems: 'center', marginTop: Spacing.md },
  continueBtnText: { color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.5 },
});
