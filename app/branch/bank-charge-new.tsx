// Add Bank Charge — mirrors bank_charge_add() web view.
// Fields: Description, Amount, Payment Method (cash/bank), Transaction Date.
// Amount is auto-comma-formatted while typing; commas are stripped before
// submission so Django's Decimal parser doesn't reject "50,000".
// Date uses the native calendar picker (no manual YYYY-MM-DD typing).
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { DateInput } from '@/components/ui/DateInput';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { formatAmountCommas, stripAmountCommas, getTodayLocal } from '@/lib/format';
import { ReportService } from '@/lib/services';
import { useBranchStore } from '@/store/branchStore';

const NAVY = '#0d1b2e';
const TEAL = '#0da9a9';

export default function BankChargeNewScreen() {
  const qc = useQueryClient();
  const { selectedBranch } = useBranchStore();

  const [description,    setDescription]    = useState('');
  const [amount,         setAmount]         = useState('');
  const [paymentMethod,  setPaymentMethod]  = useState<'cash' | 'bank'>('bank');
  const [transactionDate, setTransactionDate] = useState(getTodayLocal());

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () => ReportService.addBankCharge({
      description: description.trim(),
      // Strip commas before sending — Django parses Decimal from this string,
      // and Decimal("50,000") raises InvalidOperation.
      amount:            stripAmountCommas(amount),
      payment_method:    paymentMethod,
      transaction_date:  transactionDate,
    }),
    onSuccess: (res: any) => {
      Toast.show({
        type: 'success',
        text1: '✓ Bank charge recorded',
        text2: res?.message ?? `TZS ${amount}/= saved.`,
      });
      // Invalidate the report so it refreshes if user navigates there next
      qc.invalidateQueries({ queryKey: ['bank-charges'] });
      router.back();
    },
    onError: (e: any) => {
      Toast.show({
        type: 'error',
        text1: 'Save failed',
        text2: e?.response?.data?.detail ?? e?.response?.data?.error ?? 'Please try again.',
        visibilityTime: 6000,
      });
    },
  });

  const handleSubmit = () => {
    const rawAmount = stripAmountCommas(amount);
    if (!description.trim()) {
      Alert.alert('Missing description', 'Please describe the bank charge.');
      return;
    }
    if (!rawAmount || Number(rawAmount) <= 0) {
      Alert.alert('Invalid amount', 'Please enter an amount greater than zero.');
      return;
    }
    if (!transactionDate) {
      Alert.alert('Missing date', 'Please select the transaction date.');
      return;
    }
    Alert.alert(
      'Confirm Bank Charge',
      `Record charge of TZS ${amount}/= via ${paymentMethod.toUpperCase()}?\n\n${description}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', style: 'default', onPress: () => submit() },
      ]
    );
  };

  return (
    <ScreenLayout title="Add Bank Charge" subtitle={selectedBranch?.name} showBack>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={s.card}>
            {/* Description */}
            <Text style={s.label}>Description *</Text>
            <TextInput
              style={[s.input, { height: 70, textAlignVertical: 'top' }]}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Monthly maintenance fee, SMS charges…"
              placeholderTextColor={Colors.textMuted}
              multiline
            />

            {/* Amount */}
            <Text style={[s.label, { marginTop: 16 }]}>Amount (TZS) *</Text>
            <View style={s.amountWrap}>
              <TextInput
                style={s.inputFlex}
                value={amount}
                onChangeText={v => setAmount(formatAmountCommas(v))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={s.suffix}>/=</Text>
            </View>

            {/* Payment method */}
            <Text style={[s.label, { marginTop: 16 }]}>Payment Method *</Text>
            <View style={s.chipRow}>
              {[
                { value: 'cash' as const, label: '💵 Cash', desc: 'From cash in office' },
                { value: 'bank' as const, label: '🏦 Bank', desc: 'From bank balance' },
              ].map(m => (
                <TouchableOpacity
                  key={m.value}
                  style={[s.methodChip, paymentMethod === m.value && s.methodChipActive]}
                  onPress={() => setPaymentMethod(m.value)}
                >
                  <Text style={[s.methodLabel, paymentMethod === m.value && s.methodLabelActive]}>{m.label}</Text>
                  <Text style={[s.methodDesc,  paymentMethod === m.value && s.methodDescActive]}>{m.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Transaction date */}
            <Text style={[s.label, { marginTop: 16 }]}>Transaction Date *</Text>
            <DateInput
              value={transactionDate}
              onChange={setTransactionDate}
              placeholder="Pick a date"
            />
          </View>

          {/* Info card */}
          <View style={s.infoCard}>
            <Text style={s.infoText}>
              ℹ The branch balance will be checked before saving. If insufficient
              {' '}{paymentMethod === 'cash' ? 'cash in office' : 'bank balance'}, the
              server will reject the charge.
            </Text>
          </View>

          {/* Actions */}
          <View style={s.actionsRow}>
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={() => router.back()}
              disabled={isPending}
            >
              <Text style={s.cancelBtnText}>← Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.saveBtn, isPending && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={isPending}
            >
              {isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.saveBtnText}>💾  SAVE CHARGE</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, margin: Spacing.base,
    borderRadius: Radius.md, padding: Spacing.base, ...Shadow.sm,
  },
  label: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: Colors.text,
    backgroundColor: '#fff',
  },
  amountWrap: { flexDirection: 'row', alignItems: 'center' },
  inputFlex: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: Colors.text, backgroundColor: '#fff',
  },
  suffix: { marginLeft: 8, fontSize: 14, color: Colors.textMuted, fontWeight: '600' },

  chipRow: { flexDirection: 'row', gap: 10 },
  methodChip: {
    flex: 1, paddingVertical: 12, paddingHorizontal: 12,
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    backgroundColor: '#fff', alignItems: 'center', gap: 3,
  },
  methodChipActive: { backgroundColor: TEAL, borderColor: TEAL },
  methodLabel:       { fontSize: 14, fontWeight: '700', color: Colors.text },
  methodLabelActive: { color: '#fff' },
  methodDesc:        { fontSize: 10, color: Colors.textMuted },
  methodDescActive:  { color: '#e0f7f7' },

  infoCard: {
    backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe',
    borderRadius: Radius.md, marginHorizontal: Spacing.base,
    padding: 12, marginBottom: Spacing.md,
  },
  infoText: { fontSize: 11, color: '#1e40af', lineHeight: 16 },

  actionsRow: { flexDirection: 'row', gap: 12, marginHorizontal: Spacing.base },
  cancelBtn: {
    flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 12, alignItems: 'center',
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
  },
  cancelBtnText: { color: Colors.text, fontWeight: '600', fontSize: 13 },
  saveBtn: {
    flex: 2, backgroundColor: NAVY, paddingVertical: 12, alignItems: 'center',
    borderRadius: Radius.md, ...Shadow.sm,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
});
