// Edit Loan / Re Schedule — mirrors the web loan_edit() view exactly.
// Form fields: Amount, Interest per annum %, Loan Type, Period (months),
// Starting Payment Month (application_date), Disbursement via, Loan Purpose.
// End Payment Day is computed and shown read-only.
// Below the form: live-calculated "UPDATED LOAN REPAYMENT SUMMARY" and
// "UPDATED MONTHLY INSTALLMENT SCHEDULES" table — all derived client-side
// with the same formulas the server uses on save, so what you see before
// hitting Save is exactly what the server will store.
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { formatAmountCommas, stripAmountCommas } from '@/lib/format';
import api from '@/lib/api';
import { DateInput } from '@/components/ui/DateInput';

const ORANGE = '#f5811f';
const GOLD   = '#c8a96e';
const TEAL   = '#0da9a9';
const NAVY   = '#0d1b2e';

const LOAN_TYPES = ['Maendeleo', 'Dharura', 'Hazina', 'Elimu'];
const DISBURSEMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
];

function fmt(n: number): string {
  if (!n || isNaN(n)) return '0';
  return Math.round(n).toLocaleString('en-US');
}

// Convert a Date to YYYY-MM-DD in local time (not UTC)
function localISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Compute first_repayment_date exactly like the server:
//   if application_date.day <= 18 → 28th of same month
//   else                          → 28th of next month
function computeFirstRepayment(appDateStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(appDateStr);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (d <= 18) return new Date(y, mo - 1, 28);
  // roll to next month
  const nextMonth = mo === 12 ? 1 : mo + 1;
  const nextYear  = mo === 12 ? y + 1 : y;
  return new Date(nextYear, nextMonth - 1, 28);
}

// Compute end payment date = frd + (period-1) months on day 28
function computeEndDate(frd: Date, period: number): Date {
  const y = frd.getFullYear();
  const m = frd.getMonth();
  const targetMonth = m + (period - 1);
  return new Date(y + Math.floor(targetMonth / 12), targetMonth % 12, 28);
}

export default function LoanEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const loanId = Number(id);
  const qc = useQueryClient();

  // Load current loan values — same endpoint used elsewhere for loan detail
  const { data: loan, isLoading } = useQuery({
    queryKey: ['loan-detail', loanId],
    queryFn: () => api.get(`/loans/${loanId}/`).then(r => r.data),
    enabled: !!loanId,
  });

  // Form state — kept as strings so TextInput onChangeText round-trips cleanly
  const [amount,        setAmount]        = useState('');
  const [interestRate,  setInterestRate]  = useState('');
  const [loanType,      setLoanType]      = useState('');
  const [period,        setPeriod]        = useState('');
  const [appDate,       setAppDate]       = useState('');
  const [txMethod,      setTxMethod]      = useState('cash');
  const [loanPurpose,   setLoanPurpose]   = useState('');
  const [initialized,   setInitialized]   = useState(false);

  // Prefill when loan arrives (once)
  React.useEffect(() => {
    if (!loan || initialized) return;
    setAmount(formatAmountCommas(String(loan.loan_amount ?? '')));
    setInterestRate(String(loan.interest_rate ?? ''));
    setLoanType(loan.loan_type ?? '');
    setPeriod(String(loan.payment_period_months ?? ''));
    setAppDate(loan.application_date ?? '');
    setTxMethod(loan.transaction_method ?? 'cash');
    setLoanPurpose(loan.loan_purpose ?? '');
    setInitialized(true);
  }, [loan, initialized]);

  // Live derived values (mirrors server formulas)
  const derived = useMemo(() => {
    const P = Number(stripAmountCommas(amount)) || 0;
    const I = Number(interestRate) || 0;
    const N = Number(period) || 0;
    if (P <= 0 || N <= 0) return null;

    const totalInterest = (I / 100) * P;
    const totalReturn   = P + totalInterest;
    const monthly       = totalReturn / N;

    const frd = computeFirstRepayment(appDate);
    const endDate = frd ? computeEndDate(frd, N) : null;

    // Schedule rows — evenly-split principal + interest per month, running balance
    const rows = [];
    const principalPer = P / N;
    const interestPer  = totalInterest / N;
    let balance = totalReturn;
    for (let i = 0; i < N; i++) {
      const rowDate = frd
        ? new Date(frd.getFullYear() + Math.floor((frd.getMonth() + i) / 12),
                   (frd.getMonth() + i) % 12, 28)
        : null;
      balance -= (principalPer + interestPer);
      rows.push({
        phase:     i + 1,
        date:      rowDate ? rowDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—',
        principal: principalPer,
        interest:  interestPer,
        total:     principalPer + interestPer,
        balance:   Math.max(balance, 0),
      });
    }

    return {
      P, totalInterest, totalReturn, monthly,
      frd, endDate, rows,
    };
  }, [amount, interestRate, period, appDate]);

  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: () => api.post(`/loans/${loanId}/edit/`, {
      loan_amount:           stripAmountCommas(amount),
      interest_rate:         interestRate,
      loan_type:             loanType,
      payment_period_months: period,
      application_date:      appDate,
      transaction_method:    txMethod,
      loan_purpose:          loanPurpose,
    }).then(r => r.data),
    onSuccess: (res: any) => {
      Toast.show({
        type: 'success',
        text1: `✓ Loan #${loanId} updated`,
        text2: 'Schedule and remaining balance recalculated.',
      });
      // Invalidate the caches that show this loan
      qc.invalidateQueries({ queryKey: ['loan-detail', loanId] });
      qc.invalidateQueries({ queryKey: ['loan-schedule', loanId] });
      qc.invalidateQueries({ queryKey: ['client-loans-detail'] });
      qc.invalidateQueries({ queryKey: ['customer-report'] });
      qc.invalidateQueries({ queryKey: ['customer-loans-branch'] });
      router.back();
    },
    onError: (e: any) => {
      Toast.show({
        type: 'error',
        text1: 'Save failed',
        text2: e?.response?.data?.error ?? e?.response?.data?.detail ?? 'Please try again.',
        visibilityTime: 5000,
      });
    },
  });

  const handleSave = () => {
    if (!derived) {
      Alert.alert('Missing values', 'Please enter amount, interest, and period.');
      return;
    }
    Alert.alert(
      'Confirm Save',
      `Update loan #${loanId} with new schedule?\n\nMonthly: ${fmt(derived.monthly)} /=\nTotal Return: ${fmt(derived.totalReturn)} /=`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', style: 'destructive', onPress: () => save() },
      ]
    );
  };

  if (isLoading || !loan) {
    return (
      <ScreenLayout title="Edit Loan" showBack>
        <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
      </ScreenLayout>
    );
  }

  const clientName = loan.client_name || loan.client?.firstname || '';

  return (
    <ScreenLayout title={`Edit Loan #${loanId}`} subtitle={clientName} showBack>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Loan status strip — read-only snapshot */}
          <View style={s.statusStrip}>
            {[
              { label: 'Loan Type',      value: loan.loan_type || '—' },
              { label: 'Original Amount',value: `${fmt(Number(loan.loan_amount))} /=` },
              { label: 'Total Repayable',value: `${fmt(Number(loan.total_repayment_amount))} /=` },
              { label: 'Already Paid',   value: `${fmt(Number(loan.total_paid ?? loan.paid_amount ?? 0))} 0 /=`, color: Colors.success },
              { label: 'Remaining',      value: `${fmt(Number(loan.repayment_amount_remaining))} /=`, color: ORANGE },
              { label: 'Status',         value: loan.status || '—' },
            ].map((f, i) => (
              <View key={f.label} style={s.statusCell}>
                <Text style={s.statusLabel}>{f.label}</Text>
                <Text style={[s.statusValue, f.color && { color: f.color }]}>{f.value}</Text>
              </View>
            ))}
          </View>

          {/* ── Form ────────────────────────────────────────────────────── */}
          <View style={s.formCard}>
            {/* Amount */}
            <FieldRow label="Amount *">
              <View style={s.amountWrap}>
                <TextInput
                  style={s.inputFlex}
                  value={amount}
                  onChangeText={v => setAmount(formatAmountCommas(v))}
                  keyboardType="numeric"
                  placeholder="500,000"
                  placeholderTextColor={Colors.textMuted}
                />
                <Text style={s.suffix}>/=</Text>
              </View>
            </FieldRow>

            {/* Interest */}
            <FieldRow label="Interest per annum %">
              <TextInput
                style={s.input}
                value={interestRate}
                onChangeText={setInterestRate}
                keyboardType="decimal-pad"
                placeholder="30.00"
                placeholderTextColor={Colors.textMuted}
              />
            </FieldRow>

            {/* Loan type */}
            <FieldRow label="Loan Type">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {LOAN_TYPES.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[s.chip, loanType === t && s.chipActive]}
                      onPress={() => setLoanType(t)}
                    >
                      <Text style={[s.chipText, loanType === t && s.chipTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </FieldRow>

            {/* Period */}
            <FieldRow label="Period (Months)">
              <TextInput
                style={s.input}
                value={period}
                onChangeText={setPeriod}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor={Colors.textMuted}
              />
            </FieldRow>

            {/* Starting Payment Month (application_date) */}
            <FieldRow label="Starting Payment Month">
              <DateInput value={appDate} onChange={setAppDate} style={s.input} />
            </FieldRow>

            {/* End Payment Day (read-only, computed) */}
            <FieldRow label="End Payment Day">
              <TextInput
                style={[s.input, s.inputReadonly]}
                value={derived?.endDate ? localISO(derived.endDate) : '—'}
                editable={false}
              />
            </FieldRow>

            {/* Disbursement via */}
            <FieldRow label="Disbursement via">
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {DISBURSEMENT_METHODS.map(m => (
                  <TouchableOpacity
                    key={m.value}
                    style={[s.chip, txMethod === m.value && s.chipActive]}
                    onPress={() => setTxMethod(m.value)}
                  >
                    <Text style={[s.chipText, txMethod === m.value && s.chipTextActive]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </FieldRow>

            {/* Loan Purpose */}
            <FieldRow label="Loan Purpose">
              <TextInput
                style={[s.input, { height: 60, textAlignVertical: 'top' }]}
                value={loanPurpose}
                onChangeText={setLoanPurpose}
                placeholder="Purpose of the loan"
                placeholderTextColor={Colors.textMuted}
                multiline
              />
            </FieldRow>
          </View>

          {/* ── UPDATED LOAN REPAYMENT SUMMARY ─────────────────────────── */}
          {derived && (
            <View style={s.summaryCard}>
              <Text style={s.summaryHeader}>UPDATED LOAN REPAYMENT SUMMARY</Text>
              <View style={s.summaryRow}>
                <View style={s.summaryCell}>
                  <Text style={s.summaryLabel}>Monthly Repayment</Text>
                  <Text style={s.summaryValue}>{fmt(derived.monthly)} /=</Text>
                </View>
                <View style={s.summaryCell}>
                  <Text style={s.summaryLabel}>Total Return Amount</Text>
                  <Text style={s.summaryValue}>{fmt(derived.totalReturn)} /=</Text>
                </View>
                <View style={s.summaryCell}>
                  <Text style={s.summaryLabel}>Total Interest Amount</Text>
                  <Text style={s.summaryValue}>{fmt(derived.totalInterest)} /=</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── UPDATED MONTHLY INSTALLMENT SCHEDULES ──────────────────── */}
          {derived && derived.rows.length > 0 && (
            <View style={s.scheduleCard}>
              <Text style={s.scheduleHeader}>UPDATED MONTHLY INSTALLMENT SCHEDULES</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View>
                  <View style={[s.schRow, s.schThead]}>
                    {['Phase','Date','Principal','Interest','Total','Balance'].map((h, i) => (
                      <Text key={h} style={[s.schCell, s.schTheadText,
                        h === 'Phase' ? { width: 55, textAlign: 'center' } :
                        h === 'Date'  ? { width: 90 } :
                        { width: 100, textAlign: 'right' }]}>{h}</Text>
                    ))}
                  </View>
                  {derived.rows.map((r, i) => (
                    <View key={i} style={[s.schRow, i % 2 === 1 && { backgroundColor: '#f0f8ff' }]}>
                      <Text style={[s.schCell, { width: 55, textAlign: 'center', color: Colors.textMuted }]}>{r.phase}</Text>
                      <Text style={[s.schCell, { width: 90, color: Colors.textSecondary }]}>{r.date}</Text>
                      <Text style={[s.schCell, { width: 100, textAlign: 'right' }]}>{fmt(r.principal)}</Text>
                      <Text style={[s.schCell, { width: 100, textAlign: 'right' }]}>{fmt(r.interest)}</Text>
                      <Text style={[s.schCell, { width: 100, textAlign: 'right' }]}>{fmt(r.total)}</Text>
                      <Text style={[s.schCell, { width: 100, textAlign: 'right', color: r.balance > 0 ? Colors.error : Colors.textMuted }]}>{fmt(r.balance)}</Text>
                    </View>
                  ))}
                  <View style={[s.schRow, s.schTfoot]}>
                    <Text style={[s.schCell, s.schTfootText, { width: 55+90 }]}>Total</Text>
                    <Text style={[s.schCell, s.schTfootText, { width: 100, textAlign: 'right' }]}>{fmt(derived.P)}</Text>
                    <Text style={[s.schCell, s.schTfootText, { width: 100, textAlign: 'right' }]}>{fmt(derived.totalInterest)}</Text>
                    <Text style={[s.schCell, s.schTfootText, { width: 100, textAlign: 'right' }]}>{fmt(derived.totalReturn)}</Text>
                    <Text style={[s.schCell, { width: 100 }]}> </Text>
                  </View>
                </View>
              </ScrollView>
            </View>
          )}

          {/* ── Action buttons ─────────────────────────────────────────── */}
          <View style={s.actionsRow}>
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={() => router.back()}
              disabled={isSaving}
            >
              <Text style={s.cancelBtnText}>← Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.saveBtn, isSaving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.saveBtnText}>SAVE CHANGES</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.fieldRow}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  statusStrip: {
    flexDirection: 'row', flexWrap: 'wrap',
    backgroundColor: '#eef7fa', margin: Spacing.base, borderRadius: Radius.md,
    padding: Spacing.sm, gap: 4,
  },
  statusCell: { flexGrow: 1, flexBasis: '30%', paddingVertical: 6, paddingHorizontal: 8 },
  statusLabel: { fontSize: 10, color: Colors.textMuted, marginBottom: 2 },
  statusValue: { fontSize: 12, fontWeight: '700', color: Colors.text },

  formCard: {
    backgroundColor: Colors.surface, marginHorizontal: Spacing.base,
    borderRadius: Radius.md, padding: Spacing.base, ...Shadow.sm,
    marginBottom: Spacing.md,
  },
  fieldRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
  fieldLabel: { width: 130, fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },

  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.text,
    backgroundColor: '#fff',
  },
  inputReadonly: { backgroundColor: '#f1f5f9', color: Colors.textMuted },
  amountWrap: { flexDirection: 'row', alignItems: 'center' },
  inputFlex: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.text,
    backgroundColor: '#fff',
  },
  suffix: { marginLeft: 8, fontSize: 13, color: Colors.textMuted, fontWeight: '600' },

  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt,
  },
  chipActive: { backgroundColor: TEAL, borderColor: TEAL },
  chipText:       { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  // UPDATED LOAN REPAYMENT SUMMARY card
  summaryCard: {
    backgroundColor: '#d4e5d3', marginHorizontal: Spacing.base,
    borderRadius: Radius.md, marginBottom: Spacing.md, overflow: 'hidden',
  },
  summaryHeader: {
    backgroundColor: '#a3c4a1', color: '#1a3d1a',
    fontSize: 11, fontWeight: '800', padding: 8, textAlign: 'center', letterSpacing: 0.3,
  },
  summaryRow: { flexDirection: 'row', padding: 12 },
  summaryCell: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 10, color: '#496649', fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  summaryValue: { fontSize: 13, fontWeight: '800', color: '#1a3d1a' },

  // UPDATED MONTHLY INSTALLMENT SCHEDULES card
  scheduleCard: {
    backgroundColor: Colors.surface, marginHorizontal: Spacing.base,
    borderRadius: Radius.md, marginBottom: Spacing.md, overflow: 'hidden', ...Shadow.sm,
  },
  scheduleHeader: {
    backgroundColor: '#c8d8f0', color: '#1a3d80',
    fontSize: 11, fontWeight: '800', padding: 8, textAlign: 'center', letterSpacing: 0.3,
  },
  schRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: '#e8f4f8' },
  schThead: { backgroundColor: '#eef7fa', borderBottomWidth: 0 },
  schTheadText: { color: NAVY, fontWeight: '700', fontSize: 10, textTransform: 'uppercase' },
  schCell: { fontSize: 11, color: Colors.text, paddingHorizontal: 3 },
  schTfoot: { backgroundColor: GOLD, borderBottomWidth: 0 },
  schTfootText: { color: '#1a1a1a', fontWeight: '700', fontSize: 11 },

  // Action buttons
  actionsRow: {
    flexDirection: 'row', gap: 12, marginHorizontal: Spacing.base, marginTop: Spacing.sm,
  },
  cancelBtn: {
    flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 12, alignItems: 'center',
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
  },
  cancelBtnText: { color: Colors.text, fontWeight: '600', fontSize: 13 },
  saveBtn: {
    flex: 2, backgroundColor: ORANGE, paddingVertical: 12, alignItems: 'center',
    borderRadius: Radius.md, elevation: 2,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
});
