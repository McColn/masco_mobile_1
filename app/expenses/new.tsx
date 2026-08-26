import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { ExpenseService } from '@/lib/services';
import { QK } from '@/lib/queryClient';
import { getTodayLocal } from '@/lib/format';
import { DateInput } from '@/components/ui/DateInput';

const METHODS = [
  { v: 'cash',         l: '💵 Cash' },
  { v: 'bank',         l: '🏦 Bank' },
  { v: 'mobile_money', l: '📱 Mobile' },
];

export default function NewExpenseScreen() {
  const qc = useQueryClient();

  const [description,       setDescription]       = useState('');
  const [amount,            setAmount]            = useState('');
  const [categoryId,        setCategoryId]        = useState<number | null>(null);
  const [paymentMethod,     setPaymentMethod]     = useState('cash');
  const [transactionDate,   setTransactionDate]   = useState(
    getTodayLocal()
  );

  // Load categories
  const { data: categories, isLoading: loadingCats } = useQuery({
    queryKey: ['expense-categories-form'],
    queryFn: ExpenseService.categories,
  });
  const cats: any[] = Array.isArray(categories) ? categories : [];

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      // Build payload matching Django ExpenseSerializer exactly:
      // transaction_type = FK id (integer, required)
      // payment_method   = cash | bank | mobile_money
      // transaction_date = DateField (optional)
      const payload: any = {
        description:      description.trim(),
        amount:           amount,
        transaction_type: Number(categoryId),  // FK integer - must be number
        payment_method:   paymentMethod,
        transaction_date: transactionDate || null,
      };
      return ExpenseService.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.expenses() });
      Toast.show({ type: 'success', text1: 'Expense Added', text2: description });
      router.back();
    },
    onError: (e: any) => {
      const status = e?.response?.status;
      const data   = e?.response?.data;

      let msg = 'Something went wrong. Please try again.';

      if (status === 500) {
        // Server-side IntegrityError or unhandled exception
        msg = 'Server error (500). Check that a valid category is selected.';
      } else if (typeof data === 'string') {
        msg = data;
      } else if (data?.detail) {
        msg = data.detail;
      } else if (data && typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        const firstErr = data[firstKey];
        msg = firstKey + ': ' + (Array.isArray(firstErr) ? firstErr[0] : String(firstErr));
      } else if (e?.message) {
        msg = e.message;
      }

      console.error('[EXPENSE CREATE] status:', status, 'data:', JSON.stringify(data));
      Toast.show({ type: 'error', text1: 'Failed to Add Expense', text2: msg, visibilityTime: 6000 });
    },
  });

  const canSubmit = description.trim().length > 0 && amount.length > 0 && categoryId !== null && !isPending;

  return (
    <ScreenLayout title="Add Expense" showBack>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>

            {/* Description */}
            <View style={styles.field}>
              <Text style={styles.label}>Description <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Office supplies, Fuel..."
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            {/* Amount */}
            <View style={styles.field}>
              <Text style={styles.label}>Amount (TZS) <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="e.g. 50000"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
              />
            </View>

            {/* Category — required FK */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Category <Text style={styles.required}>*</Text>
                {categoryId === null && <Text style={styles.hintText}> (select one)</Text>}
              </Text>
              {loadingCats ? (
                <ActivityIndicator color={Colors.primary} style={{ padding: 8 }} />
              ) : cats.length === 0 ? (
                <Text style={styles.noCatsText}>No categories found. Add categories first in HQ settings.</Text>
              ) : (
                <View style={styles.chipGrid}>
                  {cats.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.chip, categoryId === c.id && styles.chipActive]}
                      onPress={() => setCategoryId(c.id)}
                    >
                      <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Payment Method */}
            <View style={styles.field}>
              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.chipRow}>
                {METHODS.map(m => (
                  <TouchableOpacity
                    key={m.v}
                    style={[styles.chip, paymentMethod === m.v && styles.chipActive]}
                    onPress={() => setPaymentMethod(m.v)}
                  >
                    <Text style={[styles.chipText, paymentMethod === m.v && styles.chipTextActive]}>
                      {m.l}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Date */}
            <View style={styles.field}>
              <Text style={styles.label}>Transaction Date</Text>
              <DateInput value={transactionDate} onChange={setTransactionDate} style={styles.input} />
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={() => mutate()}
            disabled={!canSubmit}
          >
            {isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitText}>✓  Add Expense</Text>
            }
          </TouchableOpacity>

          {!canSubmit && !isPending && (
            <Text style={styles.validationHint}>
              {!description.trim() ? '• Enter a description\n' : ''}
              {!amount ? '• Enter an amount\n' : ''}
              {categoryId === null ? '• Select a category' : ''}
            </Text>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.base, paddingBottom: 48, gap: Spacing.md },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    ...Shadow.sm,
    gap: Spacing.lg,
  },
  field: { gap: 8 },
  label: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  required: { color: Colors.error },
  hintText: { color: Colors.error, fontWeight: Typography.weights.regular, textTransform: 'none' },
  noCatsText: { fontSize: Typography.sizes.sm, color: Colors.textMuted, fontStyle: 'italic' },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: Typography.sizes.base,
    color: Colors.text,
    backgroundColor: Colors.surfaceAlt,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  chipTextActive: { color: '#fff', fontWeight: Typography.weights.semibold },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    ...Shadow.md,
  },
  submitBtnDisabled: { backgroundColor: Colors.textMuted, shadowOpacity: 0 },
  submitText: { color: '#fff', fontWeight: Typography.weights.bold, fontSize: Typography.sizes.base },
  validationHint: {
    fontSize: Typography.sizes.xs,
    color: Colors.error,
    textAlign: 'center',
    lineHeight: 20,
  },
});
