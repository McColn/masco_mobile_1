// Loan Calculator — mirrors the web template exactly
// Inputs: Amount, Interest per annum %, Loan Type, Period (free number), Start Date, Outstanding
// Results: Monthly Repayment, Total Return, Total Interest, Amount to Deposit
// Schedule: Phase | Date | Principal | Interest | Total | Balance
// Signature section below schedule

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { getTodayLocal, formatAmountCommas, stripAmountCommas } from '@/lib/format';
import { DateInput } from '@/components/ui/DateInput';

const NAVY = '#1a3048';
const SAGE = '#d6e0d6';
const GOLD = '#d4b97a';
const SCHEDULE_HEADER = '#aecfde';

// ── Helpers ──────────────────────────────────────────────────────────────────
function round1000(val: number): number {
  return Math.ceil(val / 1000) * 1000;
}

function fmtNum(n: number): string {
  if (isNaN(n)) return '0';
  return Math.round(n).toLocaleString('en-US');
}

function fmtDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const mon = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${mon}/${d.getFullYear()}`;
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtMonth(d: Date): string {
  return MONTHS_SHORT[d.getMonth()] + '/' + d.getFullYear();
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

// ── Schedule row type ─────────────────────────────────────────────────────────
interface ScheduleRow {
  phase: number | string;
  date: string;
  principal: number;
  interest: number;
  total: number;
  balance: number;
  isLast?: boolean;
  isOpening?: boolean;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function LoanCalculatorScreen() {
  const [amount,      setAmount]      = useState('');
  const [rate,        setRate]        = useState('');
  const [loanType,    setLoanType]    = useState('');
  const [period,      setPeriod]      = useState('');
  const [startDate,   setStartDate]   = useState(() => getTodayLocal());
  const [outstanding, setOutstanding] = useState('');

  // Results
  const [results,   setResults]   = useState<any>(null);
  const [schedule,  setSchedule]  = useState<ScheduleRow[]>([]);
  const [endDate,   setEndDate]   = useState('');

  // Recalculate whenever any input changes
  useEffect(() => { calculate(); }, [amount, rate, loanType, period, startDate, outstanding]);

  function calculate() {
    const P = parseFloat(amount.replace(/,/g, '')) || 0;
    const I = parseFloat(rate) || 0;
    const N = parseInt(period) || 0;

    if (!P || !I || !N || !startDate) {
      setResults(null); setSchedule([]); setEndDate('');
      return;
    }

    const totalInterest = (I / 100) * P;
    const totalReturn   = P + totalInterest;

    // Rounding strategy: ceil to 1000 for standard months, last absorbs remainder
    const stdMonthly   = round1000(totalReturn / N);
    const stdPrincipal = round1000(P / N);
    const stdInterest  = stdMonthly - stdPrincipal;

    const lastPrincipal = P             - stdPrincipal * (N - 1);
    const lastInterest  = totalInterest - stdInterest  * (N - 1);
    const lastMonthly   = lastPrincipal + lastInterest;

    setResults({
      monthly:       stdMonthly,
      totalReturn,
      totalInterest,
      deposit:       P,
    });

    // First installment: day ≤ 18 → same month 28th; day > 18 → next month 28th
    const sd = new Date(startDate + 'T00:00:00');
    const first = new Date(sd);
    if (sd.getDate() > 18) first.setMonth(first.getMonth() + 1);
    first.setDate(28);

    const end = addMonths(first, N - 1);
    setEndDate(fmtDate(end));

    // Build schedule rows
    const rows: ScheduleRow[] = [];
    let balance = totalReturn;

    // Opening balance row
    rows.push({ phase: '—', date: 'Opening Balance', principal: 0, interest: 0, total: 0, balance, isOpening: true });

    for (let i = 1; i <= N; i++) {
      const isLast = i === N;
      const pmt    = isLast ? lastPrincipal : stdPrincipal;
      const imt    = isLast ? lastInterest  : stdInterest;
      const rowTot = isLast ? lastMonthly   : stdMonthly;
      balance -= rowTot;
      if (Math.abs(balance) < 0.5) balance = 0;

      rows.push({
        phase: i,
        date:  fmtMonth(addMonths(first, i - 1)),
        principal: pmt, interest: imt, total: rowTot, balance,
        isLast,
      });
    }

    setSchedule(rows);
  }

  const loanTypeLabel = loanType === 'maendeleo' ? 'MAENDELEO'
                      : loanType === 'dharura'   ? 'DHARURA'   : '';

  const LOAN_TYPES = [
    { value: 'maendeleo', label: 'Maendeleo' },
    { value: 'dharura',   label: 'Dharura' },
  ];

  const scheduleRows = schedule.filter(r => !r.isOpening);
  const totPrincipal = scheduleRows.reduce((s, r) => s + r.principal, 0);
  const totInterest  = scheduleRows.reduce((s, r) => s + r.interest, 0);
  const totTotal     = scheduleRows.reduce((s, r) => s + r.total, 0);

  return (
    <ScreenLayout title="Loan Calculator" showBack>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}>

          {/* ── Header: Company name ── */}
          <View style={styles.companyHeader}>
            <Text style={styles.companyName}>MASCO FINANCE CO. LTD</Text>
            <Text style={styles.companyAddress}>P.O.BOX 30474 — KIBAHA | TANZANIA</Text>
            <Text style={styles.companyContact}>+255 718 544 515 | mascofinance@gmail.com</Text>
          </View>
          <View style={styles.accentBar} />

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Loan Calculator</Text>

            {/* Amount */}
            <Row label="Amount">
              <View style={styles.amountWrap}>
                <TextInput style={styles.inputFlex} value={amount}
                  onChangeText={v => setAmount(formatAmountCommas(v))}
                  keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.textMuted} />
                <Text style={styles.suffix}>/=</Text>
              </View>
            </Row>

            {/* Interest per annum */}
            <Row label="Interest per annum %">
              <TextInput style={styles.inputFixed} value={rate} onChangeText={setRate}
                keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textMuted} />
            </Row>

            {/* Loan type */}
            <Row label="Loan type">
              <View style={styles.chipRow}>
                <TouchableOpacity style={[styles.chip, loanType==='' && styles.chipActive]} onPress={() => setLoanType('')}>
                  <Text style={[styles.chipText, loanType==='' && styles.chipTextActive]}>—</Text>
                </TouchableOpacity>
                {LOAN_TYPES.map(t => (
                  <TouchableOpacity key={t.value}
                    style={[styles.chip, loanType===t.value && styles.chipActive]}
                    onPress={() => setLoanType(t.value)}>
                    <Text style={[styles.chipText, loanType===t.value && styles.chipTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Row>

            {/* Period */}
            <Row label="Period (Months)">
              <TextInput
                style={styles.inputFixed}
                value={period}
                onChangeText={v => {
                  // Dharura locked to 1 month
                  if (loanType === 'dharura') { setPeriod('1'); return; }
                  setPeriod(v);
                }}
                keyboardType="numeric"
                placeholder="e.g. 12"
                placeholderTextColor={Colors.textMuted}
                editable={loanType !== 'dharura'}
              />
            </Row>
            {loanType === 'dharura' && (
              <View style={styles.hintRow}>
                <Text style={styles.hintText}>⚠ Dharura loans are limited to 1 month only.</Text>
              </View>
            )}

            {/* Start date */}
            <Row label="Starting Payment Day">
              <DateInput value={startDate} onChange={setStartDate} style={styles.inputFixed} />
            </Row>

            {/* Outstanding */}
            <Row label="Outstanding Amount">
              <View style={styles.amountWrap}>
                <TextInput style={styles.inputFlex} value={outstanding} onChangeText={setOutstanding}
                  keyboardType="numeric" placeholder="Outstanding Balance" placeholderTextColor={Colors.textMuted} />
                <Text style={styles.suffix}>/=</Text>
              </View>
            </Row>

            {/* End date (calculated) */}
            <Row label="End Payment Day">
              <View style={[styles.inputFixed, styles.readOnly]}>
                <Text style={styles.readOnlyText}>{endDate || '—'}</Text>
              </View>
            </Row>
          </View>

          {/* ── Results ── */}
          {results && (
            <View style={styles.resultsCard}>
              {[
                { label: 'Monthly Repayment :',      value: fmtNum(results.monthly)       + ' /=' },
                { label: 'Total Return Amount:',      value: fmtNum(results.totalReturn)   + ' /=' },
                { label: 'Total Interest Amount:',    value: fmtNum(results.totalInterest) + ' /=' },
                { label: 'Amount to be deposited:',   value: fmtNum(results.deposit)       + ' /=' },
              ].map((r, i, arr) => (
                <View key={r.label} style={[styles.resultRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={styles.resultLabel}>{r.label}</Text>
                  <Text style={styles.resultValue}>{r.value}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Schedule ── */}
          {schedule.length > 0 && (
            <View style={styles.scheduleCard}>
              {/* Title bar */}
              <View style={styles.scheduleTitleBar}>
                <Text style={styles.scheduleTitleText}>
                  MONTHLY INSTALLMENT SCHEDULES{loanTypeLabel ? ` - [${loanTypeLabel}]` : ''}
                </Text>
              </View>

              {/* Horizontal scroll for wide table */}
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View>
                  {/* Header */}
                  <View style={[styles.schRow, styles.schHeader]}>
                    {['Phase','Date','Principal','Interest','Total','Balance'].map(h => (
                      <Text key={h} style={[styles.schCell, styles.schHeaderText,
                        h === 'Phase' ? { width: 52, textAlign: 'center' } :
                        h === 'Date'  ? { width: 80 } : { width: 105, textAlign: 'right' }]}>
                        {h}
                      </Text>
                    ))}
                  </View>

                  {/* Opening balance */}
                  <View style={[styles.schRow, { backgroundColor: '#f9f9f9' }]}>
                    <Text style={[styles.schCell, { width: 52, textAlign: 'center', color: Colors.textMuted, fontStyle: 'italic', fontSize: 10 }]}>—</Text>
                    <Text style={[styles.schCell, { width: 80, color: Colors.textMuted, fontStyle: 'italic', fontSize: 10 }]}>Opening Balance</Text>
                    <Text style={[styles.schCell, { width: 105, textAlign: 'right' }]}> </Text>
                    <Text style={[styles.schCell, { width: 105, textAlign: 'right' }]}> </Text>
                    <Text style={[styles.schCell, { width: 105, textAlign: 'right' }]}> </Text>
                    <Text style={[styles.schCell, { width: 105, textAlign: 'right', fontWeight: '700' }]}>
                      {fmtNum(schedule[0]?.balance ?? 0)}
                    </Text>
                  </View>

                  {/* Data rows */}
                  {scheduleRows.map((row, i) => (
                    <View key={i} style={[styles.schRow,
                      row.isLast ? { backgroundColor: '#fdf6e3' } : i % 2 === 1 ? { backgroundColor: '#f5f9fc' } : {}
                    ]}>
                      <Text style={[styles.schCell, { width: 52, textAlign: 'center', fontWeight: '600' }]}>{row.phase}</Text>
                      <Text style={[styles.schCell, { width: 80 }]}>{row.date}</Text>
                      <Text style={[styles.schCell, { width: 105, textAlign: 'right' }]}>{fmtNum(row.principal)}</Text>
                      <Text style={[styles.schCell, { width: 105, textAlign: 'right' }]}>{fmtNum(row.interest)}</Text>
                      <Text style={[styles.schCell, { width: 105, textAlign: 'right' }]}>{fmtNum(row.total)}</Text>
                      <Text style={[styles.schCell, { width: 105, textAlign: 'right' }]}>{fmtNum(row.balance)}</Text>
                    </View>
                  ))}

                  {/* Footer totals */}
                  <View style={[styles.schRow, styles.schFooter]}>
                    <Text style={[styles.schCell, { width: 52, textAlign: 'center', color: '#fff', fontWeight: '700' }]}>Total</Text>
                    <Text style={[styles.schCell, { width: 80 }]}> </Text>
                    <Text style={[styles.schCell, { width: 105, textAlign: 'right', color: '#fff', fontWeight: '700' }]}>{fmtNum(totPrincipal)}</Text>
                    <Text style={[styles.schCell, { width: 105, textAlign: 'right', color: '#fff', fontWeight: '700' }]}>{fmtNum(totInterest)}</Text>
                    <Text style={[styles.schCell, { width: 105, textAlign: 'right', color: '#fff', fontWeight: '700' }]}>{fmtNum(totTotal)}</Text>
                    <Text style={[styles.schCell, { width: 105 }]}> </Text>
                  </View>
                </View>
              </ScrollView>
            </View>
          )}

          {/* ── Signature section ── */}
          {results && (
            <View style={styles.sigCard}>
              <View style={styles.sigRow}>
                <View style={styles.sigItem}>
                  <Text style={styles.sigLabel}>Customer Name:</Text>
                  <View style={styles.sigLine} />
                </View>
                <View style={styles.sigItem}>
                  <Text style={styles.sigLabel}>Signature:</Text>
                  <View style={[styles.sigLine, { width: 80 }]} />
                </View>
                <View style={styles.sigItem}>
                  <Text style={styles.sigLabel}>Date:</Text>
                  <View style={[styles.sigLine, { width: 70 }]} />
                </View>
              </View>
              <View style={styles.sigRow}>
                <View style={styles.sigItem}>
                  <Text style={styles.sigLabel}>Provided by:</Text>
                  <View style={[styles.sigLine, { width: 120 }]} />
                </View>
                <View style={styles.sigItem}>
                  <Text style={styles.sigLabel}>Signature:</Text>
                  <View style={[styles.sigLine, { width: 80 }]} />
                </View>
                <View style={styles.sigItem}>
                  <Text style={styles.sigLabel}>Date:</Text>
                  <View style={[styles.sigLine, { width: 70 }]} />
                </View>
              </View>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

// ── Shared row wrapper ─────────────────────────────────────────────────────────
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.formRow}>
      <Text style={styles.formLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 48 },

  // Company header
  companyHeader: { backgroundColor: '#fff', alignItems: 'center', paddingVertical: 16, paddingHorizontal: Spacing.base, borderBottomWidth: 3, borderBottomColor: NAVY },
  companyName:    { fontSize: 18, fontWeight: '700', color: '#1a4fa0', letterSpacing: 1 },
  companyAddress: { fontSize: 12, color: '#222', marginTop: 2, fontWeight: '600' },
  companyContact: { fontSize: 11, color: '#444', marginTop: 1 },
  accentBar:      { height: 5, backgroundColor: NAVY },

  // Card
  card:         { backgroundColor: '#fff', margin: Spacing.base, marginBottom: 0, borderWidth: 1, borderColor: '#ddd', ...Shadow.sm },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', padding: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#ccc' },

  // Form rows
  formRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  formLabel: { flex: 1, fontSize: 13, color: '#2c2c2c' },

  // Inputs
  amountWrap: { flexDirection: 'row', alignItems: 'center', width: 170, borderWidth: 1, borderColor: '#bbb', borderRadius: 2, backgroundColor: '#fff', overflow: 'hidden' },
  inputFlex:  { flex: 1, paddingHorizontal: 8, paddingVertical: 7, fontSize: 13, color: '#1a1a1a' },
  suffix:     { paddingHorizontal: 7, color: '#888', borderLeftWidth: 1, borderLeftColor: '#bbb', fontSize: 11, paddingVertical: 9 },
  inputFixed: { width: 170, borderWidth: 1, borderColor: '#bbb', borderRadius: 2, paddingHorizontal: 8, paddingVertical: 7, fontSize: 13, color: '#1a1a1a', backgroundColor: '#fff' },
  readOnly:   { backgroundColor: '#f5f5f5', justifyContent: 'center' },
  readOnlyText: { fontSize: 13, color: '#555' },

  // Loan type chips
  chipRow: { flexDirection: 'row', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 2, borderWidth: 1, borderColor: '#bbb', backgroundColor: '#f5f5f5' },
  chipActive: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { fontSize: 12, color: '#333' },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  // Dharura hint
  hintRow:  { paddingHorizontal: 16, paddingBottom: 8 },
  hintText: { fontSize: 11, color: NAVY, fontStyle: 'italic' },

  // Results
  resultsCard: { backgroundColor: SAGE, marginHorizontal: Spacing.base, marginTop: 0, borderWidth: 1, borderTopWidth: 0, borderColor: '#ddd' },
  resultRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  resultLabel: { fontSize: 13, color: '#1a1a1a' },
  resultValue: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', textDecorationLine: 'underline' },

  // Schedule
  scheduleCard: { margin: Spacing.base, marginBottom: 0, borderWidth: 1, borderColor: '#ddd', overflow: 'hidden' },
  scheduleTitleBar: { backgroundColor: '#c8a0a8', paddingHorizontal: 16, paddingVertical: 9 },
  scheduleTitleText: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', letterSpacing: 0.5 },
  schRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  schHeader: { backgroundColor: SCHEDULE_HEADER },
  schFooter: { backgroundColor: GOLD, borderBottomWidth: 0 },
  schCell: { fontSize: 11, color: '#1a1a1a', paddingHorizontal: 8, paddingVertical: 7, borderRightWidth: 1, borderRightColor: '#ddd' },
  schHeaderText: { fontWeight: '600' },

  // Signature
  sigCard: { margin: Spacing.base, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderTopWidth: 0, padding: 16, gap: 14 },
  sigRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sigItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sigLabel: { fontSize: 12, color: '#1a1a1a' },
  sigLine:  { width: 110, borderBottomWidth: 1, borderBottomColor: '#333', height: 14 },
});
