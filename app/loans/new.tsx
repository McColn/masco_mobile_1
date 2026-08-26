// loans/new.tsx — mirrors process_loan_partb web template exactly
// Business rules from web:
//   Maendeleo active -> must top-up (amount > outstanding), submit calls /loans/<id>/topup/
//   Dharura  active  -> Dharura blocked, warning shown, submit disabled
//   Dharura  new     -> max 200,000, period locked to 1 month
//   Auto start date  -> day ≤18 = 1st current month, day ≥19 = 1st next month (read-only)
//   End date         -> calculated from start date + period (read-only)
//   Schedule table   -> Phase/Date/Principal/Interest/Total/Balance (same formula as web)
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { LoanService, ClientService } from '@/lib/services';
import { QK } from '@/lib/queryClient';
import { useDebounce } from '@/hooks/useDebounce';
import { formatAmountCommas } from '@/lib/format';
import api from '@/lib/api';

// ── Constants ──────────────────────────────────────────────────────────────
const DHARURA_MAX       = 200000;
const MONTH_NAMES       = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const ORANGE            = '#f0a830';
const RED_BLOCKED       = '#e74c3c';
const GREEN_SUMMARY     = '#d4edda';
const BLUE_HEADER       = '#5bc0de';
const GOLD_FOOT         = '#c8a96e';

// ── Helpers ────────────────────────────────────────────────────────────────
function ceil1000(v: number) { return Math.ceil(v / 1000) * 1000; }
function fmtN(n: number) { return Math.round(n).toLocaleString('en-US') + ' /='; }
function addMonths(d: Date, n: number) { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; }
function fmtMonth(d: Date) { return MONTH_NAMES[d.getMonth()] + '/' + d.getFullYear(); }
function fmtDate(d: Date) {
  return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
}

// Auto start date: day ≤18 → 1st of current month; day ≥19 → 1st of next month
function getAutoStartDate(): { display: string; iso: string } {
  const today = new Date();
  const day = today.getDate();
  let yr = today.getFullYear(), mo = today.getMonth();
  if (day >= 19) { mo++; if (mo > 11) { mo = 0; yr++; } }
  const isoMo = String(mo + 1).padStart(2, '0');
  return { display: `01/${isoMo}/${yr}`, iso: `${yr}-${isoMo}-01` };
}

// Schedule calculation — same formula as web template
interface SchedRow { phase: number; date: string; principal: number; interest: number; total: number; balance: number; isLast: boolean; }
function buildSchedule(P: number, I: number, N: number, startIso: string): SchedRow[] {
  if (!P || !I || !N || !startIso) return [];
  const totalInterest = (I / 100) * P;
  const totalReturn   = P + totalInterest;
  const stdMonthly    = ceil1000(totalReturn / N);
  const stdPrincipal  = ceil1000(P / N);
  const stdInterest   = stdMonthly - stdPrincipal;
  const lastPrincipal = P             - stdPrincipal * (N - 1);
  const lastInterest  = totalInterest - stdInterest  * (N - 1);
  const lastMonthly   = lastPrincipal + lastInterest;

  // First installment: day ≤18 → same month 28th, day >18 → next month 28th
  const sd = new Date(startIso + 'T00:00:00');
  const first = new Date(sd);
  if (sd.getDate() > 18) first.setMonth(first.getMonth() + 1);
  first.setDate(28);

  const rows: SchedRow[] = [];
  let balance = totalReturn;
  for (let i = 1; i <= N; i++) {
    const isLast = i === N;
    const pmt  = isLast ? lastPrincipal : stdPrincipal;
    const imt  = isLast ? lastInterest  : stdInterest;
    const tot  = isLast ? lastMonthly   : stdMonthly;
    balance -= tot;
    if (Math.abs(balance) < 0.5) balance = 0;
    rows.push({ phase: i, date: fmtMonth(addMonths(first, i-1)), principal: pmt, interest: imt, total: tot, balance, isLast });
  }
  return rows;
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function NewLoanScreen() {
  const { client_id, client_name } = useLocalSearchParams<{ client_id?: string; client_name?: string }>();
  const qc = useQueryClient();

  // Client selection
  const [selectedClient, setSelectedClient] = useState<{ id: number; name: string } | null>(
    client_id && client_name ? { id: Number(client_id), name: decodeURIComponent(client_name) } : null
  );
  const [clientSearch, setClientSearch] = useState('');
  const [showResults,  setShowResults]  = useState(false);
  const debouncedSearch = useDebounce(clientSearch, 400);

  // Form fields
  const [amount,     setAmount]     = useState('');
  const [rate,       setRate]       = useState('');
  const [loanType,   setLoanType]   = useState('');
  const [period,     setPeriod]     = useState('');
  const [txMethod,   setTxMethod]   = useState('cash');

  // Auto-computed (read-only)
  const startDate = useMemo(() => getAutoStartDate(), []);
  const [endDate, setEndDate] = useState('');

  // Recalculate end date when period changes
  useEffect(() => {
    const N = parseInt(period) || 0;
    if (!N || !startDate.iso) { setEndDate(''); return; }
    const sd = new Date(startDate.iso + 'T00:00:00');
    const first = new Date(sd);
    if (sd.getDate() > 18) first.setMonth(first.getMonth() + 1);
    first.setDate(28);
    const end = addMonths(first, N - 1);
    setEndDate(fmtDate(end));
  }, [period]);

  // Enforce Dharura period = 1
  useEffect(() => {
    if (loanType === 'Dharura') setPeriod('1');
  }, [loanType]);

  // Fetch existing active loans when client is selected
  const { data: activeLoanData } = useQuery({
    queryKey: ['client-active-loans', selectedClient?.id],
    queryFn: () => api.get(`/clients/${selectedClient!.id}/active-loans/`).then(r => r.data),
    enabled: !!selectedClient,
  });
  // API returns loans with status in ['Approved','Pending'] AND outstanding > 0
  // This matches web process_loan_partb() get_active_loan() exactly
  const existingMaendeleo = activeLoanData?.existing_maendeleo ?? null;
  const existingDharura   = activeLoanData?.existing_dharura   ?? null;

  // Client search results
  const { data: clientResults } = useQuery({
    queryKey: ['new-loan-client-search', debouncedSearch],
    queryFn: () => ClientService.list({ search: debouncedSearch, page_size: 8 }),
    enabled: debouncedSearch.length >= 2 && !selectedClient,
  });
  const searchClients = clientResults?.results ?? [];

  // ── Business rule state ──────────────────────────────────────────────────
  const amountNum    = parseFloat(amount.replace(/,/g, '')) || 0;
  const rateNum      = parseFloat(rate) || 0;
  const periodNum    = parseInt(period) || 0;

  const isTopup = loanType === 'Maendeleo' && !!existingMaendeleo;
  const isDharuraBlocked = loanType === 'Dharura' && !!existingDharura;
  const isDharuraCapped  = loanType === 'Dharura' && amountNum > DHARURA_MAX && !existingDharura;
  const isTopupAmountErr = isTopup && amountNum > 0 && amountNum <= (existingMaendeleo?.outstanding ?? 0);

  const canSubmit = !!selectedClient && !!loanType && amountNum > 0 && rateNum > 0 && periodNum > 0
    && !isDharuraBlocked && !isDharuraCapped && !isTopupAmountErr;

  const submitLabel = isDharuraBlocked ? 'BLOCKED'
    : isTopup       ? 'PROCESS TOP-UP'
    : 'SUBMIT';

  // ── Schedule ─────────────────────────────────────────────────────────────
  const schedule = useMemo(() =>
    buildSchedule(amountNum, rateNum, periodNum, startDate.iso),
    [amountNum, rateNum, periodNum, startDate.iso]
  );
  const totalInterest = amountNum * (rateNum / 100);
  const totalReturn   = amountNum + totalInterest;
  const stdMonthly    = periodNum > 0 ? ceil1000(totalReturn / periodNum) : 0;

  // ── Submit mutation ───────────────────────────────────────────────────────
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (!selectedClient) throw new Error('Select a client.');

      const payload: any = {
        loan_amount:           String(amountNum),
        interest_rate:         String(rateNum),
        payment_period_months: String(periodNum),
        loan_type:             loanType,
        transaction_method:    txMethod,
        application_date:      startDate.iso,
      };

      if (isTopup && existingMaendeleo) {
        // Top-up: POST to /loans/<original_id>/topup/
        // Matches web loan_topup() which expects:
        //   application_date = start month (YYYY-MM-01)
        //   topup_date       = today (DD/MM/YYYY) — used as topup_date and payment_month
        const today = new Date();
        const dd  = String(today.getDate()).padStart(2,'0');
        const mm  = String(today.getMonth()+1).padStart(2,'0');
        const topupDate = `${dd}/${mm}/${today.getFullYear()}`;

        const res = await api.post(`/loans/${existingMaendeleo.id}/topup/`, {
          topup_amount:       String(amountNum),
          interest_rate:      String(rateNum),
          transaction_method: txMethod,
          term_months:        String(periodNum),
          application_date:   startDate.iso,   // YYYY-MM-01 for first_repayment_date
          topup_date:         topupDate,        // DD/MM/YYYY for topup_date and payment_month
        });
        return res.data;
      } else {
        // New loan: POST to /loans/
        const res = await api.post('/loans/', {
          ...payload,
          client: selectedClient.id,
        });
        return res.data;
      }
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: QK.loans() });
      qc.invalidateQueries({ queryKey: ['client-active-loans', selectedClient?.id] });
      const msg = isTopup
        ? `Top-up #${data.id} processed for ${selectedClient?.name}`
        : `Loan #${data.id} created for ${selectedClient?.name}`;
      Toast.show({ type: 'success', text1: isTopup ? 'Top-Up Processed' : 'Loan Created', text2: msg });
      router.back();
    },
    onError: (e: any) => {
      const d = e?.response?.data;
      const msg = d?.detail ?? d?.non_field_errors?.[0]
        ?? (typeof d === 'object' ? Object.values(d).flat().join(' ') : null)
        ?? e?.message ?? 'Failed.';
      Toast.show({ type: 'error', text1: 'Error', text2: msg, visibilityTime: 6000 });
      console.error('[NEW LOAN]', e?.response?.status, JSON.stringify(d));
    },
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ScreenLayout title="PART B: LOAN DETAILS" showBack>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={s.card}>

            {/* ── Client selection ── */}
            <Text style={s.sectionTitle}>Client</Text>
            {selectedClient ? (
              <View style={s.clientRow}>
                <View style={s.clientAvatar}>
                  <Text style={s.clientAvatarText}>{selectedClient.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.clientName}>{selectedClient.name}</Text>
                  <Text style={s.clientId}>ID #{selectedClient.id}</Text>
                </View>
                {!client_id && (
                  <TouchableOpacity style={s.changeBtn} onPress={() => { setSelectedClient(null); setClientSearch(''); setLoanType(''); }}>
                    <Text style={s.changeBtnText}>Change</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                <TextInput style={s.input} value={clientSearch} onChangeText={v => { setClientSearch(v); setShowResults(true); }}
                  placeholder="Search client name or phone..." placeholderTextColor={Colors.textMuted} />
                {showResults && searchClients.length > 0 && (
                  <View style={s.searchList}>
                    {searchClients.map((c: any) => (
                      <TouchableOpacity key={c.id} style={s.searchItem}
                        onPress={() => { setSelectedClient({ id: c.id, name: c.full_name || `${c.firstname} ${c.lastname}`.trim() }); setShowResults(false); setClientSearch(''); }}>
                        <Text style={s.searchName}>{c.full_name || `${c.firstname} ${c.lastname}`}</Text>
                        <Text style={s.searchSub}>{c.phonenumber}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            <View style={s.divider} />

            {/* ── Amount ── */}
            <FormRow label="Amount *">
              <View style={s.amountWrap}>
                <TextInput style={s.inputFlex} value={amount}
                  onChangeText={v => setAmount(formatAmountCommas(v))}
                  keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.textMuted} />
                <Text style={s.suffix}>/=</Text>
              </View>
            </FormRow>

            {/* ── Interest rate ── */}
            <FormRow label="Interest per annum %">
              <TextInput style={s.inputFixed} value={rate} onChangeText={setRate}
                keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textMuted} />
            </FormRow>

            {/* ── Loan type ── */}
            <FormRow label="Loan type">
              <View style={s.chipRow}>
                {['Maendeleo','Dharura'].map(t => (
                  <TouchableOpacity key={t} style={[s.chip, loanType===t && s.chipActive]} onPress={() => setLoanType(t)}>
                    <Text style={[s.chipText, loanType===t && s.chipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </FormRow>

            {/* ── Period ── */}
            <FormRow label="Period (Months)">
              <TextInput style={[s.inputFixed, loanType==='Dharura' && s.inputReadOnly]}
                value={period} onChangeText={v => loanType !== 'Dharura' && setPeriod(v)}
                keyboardType="numeric" placeholder="e.g. 12" placeholderTextColor={Colors.textMuted}
                editable={loanType !== 'Dharura'} />
            </FormRow>
            {loanType === 'Dharura' && (
              <View style={s.hintRow}>
                <Text style={s.hintText}>⚠ Dharura: 1 month only</Text>
              </View>
            )}

            {/* ── Starting Payment Month (auto, read-only) ── */}
            <FormRow label="Starting Payment Month">
              <View style={[s.inputFixed, s.inputReadOnly, { justifyContent: 'center' }]}>
                <Text style={{ color: '#555', fontSize: 13 }}>{startDate.display}</Text>
              </View>
            </FormRow>

            {/* ── End Payment Day (calculated) ── */}
            <FormRow label="End Payment Day">
              <View style={[s.inputFixed, s.inputReadOnly, { justifyContent: 'center' }]}>
                <Text style={{ color: '#555', fontSize: 13 }}>{endDate || '—'}</Text>
              </View>
            </FormRow>

            {/* ── Disbursement method ── */}
            <FormRow label="Disbursement via">
              <View style={s.chipRow}>
                {[{v:'cash',l:'Cash'},{v:'bank',l:'Bank'}].map(m => (
                  <TouchableOpacity key={m.v} style={[s.chip, txMethod===m.v && s.chipActive]} onPress={() => setTxMethod(m.v)}>
                    <Text style={[s.chipText, txMethod===m.v && s.chipTextActive]}>{m.l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </FormRow>

          </View>

          {/* ── Warning: Maendeleo top-up ── */}
          {isTopup && amountNum > 0 && (
            <View style={[s.warning, { backgroundColor: ORANGE }]}>
              <Text style={s.warningText}>
                <Text style={s.warningBold}>{selectedClient?.name}</Text> has a current{' '}
                <Text style={s.warningBold}>Maendeleo</Text> loan with balance TZS{' '}
                <Text style={s.warningBold}>{fmtN(existingMaendeleo?.outstanding ?? 0)}</Text>{'\n'}
                New loan amount must be greater than TZS{' '}
                <Text style={s.warningBold}>{fmtN(existingMaendeleo?.outstanding ?? 0)}</Text>
              </Text>
            </View>
          )}

          {/* ── Error: amount ≤ outstanding ── */}
          {isTopupAmountErr && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>
                ❌ Amount must be greater than outstanding balance ({fmtN(existingMaendeleo?.outstanding ?? 0)})
              </Text>
            </View>
          )}

          {/* ── Error: Dharura over cap ── */}
          {isDharuraCapped && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>
                ❌ Dharura loan cannot exceed {DHARURA_MAX.toLocaleString('en-US')} /=
              </Text>
            </View>
          )}

          {/* ── Blocked: existing Dharura ── */}
          {isDharuraBlocked && (
            <View style={[s.warning, { backgroundColor: RED_BLOCKED }]}>
              <Text style={[s.warningText, { color: '#fff' }]}>
                ⛔ <Text style={s.warningBold}>{selectedClient?.name}</Text> already has an active{' '}
                <Text style={s.warningBold}>Dharura</Text> loan (balance:{' '}
                <Text style={s.warningBold}>{fmtN(existingDharura?.outstanding ?? 0)}</Text>).{'\n'}
                A second Dharura loan is NOT allowed until the existing one is fully repaid.
              </Text>
            </View>
          )}

          {/* ── Repayment Summary strip (green header, 3 columns) ── */}
          {schedule.length > 0 && (
            <View style={s.summaryCard}>
              <View style={[s.summaryHeader, { backgroundColor: GREEN_SUMMARY }]}>
                <Text style={s.summaryHeaderText}>LOAN REPAYMENT SUMMARY</Text>
              </View>
              <View style={s.summaryRow}>
                {[
                  { label: 'Monthly Repayment',   value: fmtN(stdMonthly) },
                  { label: 'Total Return Amount',  value: fmtN(totalReturn) },
                  { label: 'Total Interest Amount',value: fmtN(totalInterest) },
                ].map((item, i, arr) => (
                  <View key={item.label} style={[s.summaryItem, i < arr.length-1 && s.summaryItemBorder]}>
                    <Text style={s.summaryLabel}>{item.label}</Text>
                    <Text style={s.summaryValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Schedule table ── */}
          {schedule.length > 0 && (
            <View style={s.scheduleCard}>
              <View style={s.scheduleTitleBar}>
                <Text style={s.scheduleTitleText}>MONTHLY INSTALLMENT SCHEDULES</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View>
                  {/* Header */}
                  <View style={[s.schRow, { backgroundColor: BLUE_HEADER }]}>
                    {['Phase','Date','Principal','Interest','Total','Balance'].map(h => (
                      <Text key={h} style={[s.schCell, s.schHeaderText,
                        h==='Phase'||h==='Date' ? {width:60,textAlign:'center'} : {width:105,textAlign:'right'}]}>
                        {h}
                      </Text>
                    ))}
                  </View>
                  {/* Opening balance row */}
                  <View style={[s.schRow, {backgroundColor:'#fff'}]}>
                    <Text style={[s.schCell,{width:60,textAlign:'center',color:Colors.textMuted}]}></Text>
                    <Text style={[s.schCell,{width:60,textAlign:'center',color:Colors.textMuted}]}></Text>
                    <Text style={[s.schCell,{width:105,textAlign:'right'}]}></Text>
                    <Text style={[s.schCell,{width:105,textAlign:'right'}]}></Text>
                    <Text style={[s.schCell,{width:105,textAlign:'right'}]}></Text>
                    <Text style={[s.schCell,{width:105,textAlign:'right',fontWeight:'700'}]}>{Math.round(totalReturn).toLocaleString('en-US')}</Text>
                  </View>
                  {/* Data rows */}
                  {schedule.map((row, i) => (
                    <View key={i} style={[s.schRow, row.isLast ? {backgroundColor:'#fdf6e3'} : i%2===1 ? {backgroundColor:'#e8f4f8'} : {backgroundColor:'#fff'}]}>
                      <Text style={[s.schCell,{width:60,textAlign:'center',color:Colors.textMuted}]}>{row.phase}</Text>
                      <Text style={[s.schCell,{width:60,textAlign:'center'}]}>{row.date}</Text>
                      <Text style={[s.schCell,{width:105,textAlign:'right'}]}>{Math.round(row.principal).toLocaleString('en-US')}</Text>
                      <Text style={[s.schCell,{width:105,textAlign:'right'}]}>{Math.round(row.interest).toLocaleString('en-US')}</Text>
                      <Text style={[s.schCell,{width:105,textAlign:'right'}]}>{Math.round(row.total).toLocaleString('en-US')}</Text>
                      <Text style={[s.schCell,{width:105,textAlign:'right'}]}>{Math.round(row.balance).toLocaleString('en-US')}</Text>
                    </View>
                  ))}
                  {/* Footer totals */}
                  <View style={[s.schRow, {backgroundColor: GOLD_FOOT}]}>
                    <Text style={[s.schCell,{width:60,textAlign:'center',fontWeight:'700',color:'#1a1a1a'}]}>Total</Text>
                    <Text style={[s.schCell,{width:60}]}></Text>
                    <Text style={[s.schCell,{width:105,textAlign:'right',fontWeight:'700',color:'#1a1a1a'}]}>{Math.round(schedule.reduce((a,r)=>a+r.principal,0)).toLocaleString('en-US')}</Text>
                    <Text style={[s.schCell,{width:105,textAlign:'right',fontWeight:'700',color:'#1a1a1a'}]}>{Math.round(schedule.reduce((a,r)=>a+r.interest,0)).toLocaleString('en-US')}</Text>
                    <Text style={[s.schCell,{width:105,textAlign:'right',fontWeight:'700',color:'#1a1a1a'}]}>{Math.round(schedule.reduce((a,r)=>a+r.total,0)).toLocaleString('en-US')}</Text>
                    <Text style={[s.schCell,{width:105}]}></Text>
                  </View>
                </View>
              </ScrollView>
            </View>
          )}

          {/* ── Submit ── */}
          <TouchableOpacity
            style={[s.submitBtn,
              isDharuraBlocked && { backgroundColor: RED_BLOCKED },
              !canSubmit && { opacity: 0.6 },
            ]}
            onPress={() => canSubmit && mutate()}
            disabled={!canSubmit || isPending}
          >
            {isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.submitText}>{submitLabel}</Text>
            }
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.formRow}>
      <Text style={s.formLabel}>{label}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  content:     { paddingBottom: 48, gap: Spacing.sm },
  card:        { backgroundColor: '#fff', margin: Spacing.base, borderWidth: 1, borderColor: '#ddd', padding: Spacing.base, ...Shadow.sm, gap: 4 },
  sectionTitle:{ fontSize: 15, fontWeight: '700', color: '#1a1a1a', borderBottomWidth: 1.5, borderBottomColor: '#999', paddingBottom: 8, marginBottom: Spacing.md },
  divider:     { height: 1, backgroundColor: '#eee', marginVertical: Spacing.sm },

  // Client
  clientRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.primary+'08', borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.primary+'25' },
  clientAvatar:   { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  clientAvatarText:{ color:'#fff', fontWeight:'700', fontSize:13 },
  clientName:     { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.text },
  clientId:       { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  changeBtn:      { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border },
  changeBtnText:  { fontSize: 11, color: Colors.primary, fontWeight: Typography.weights.semibold },
  searchList:     { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  searchItem:     { paddingHorizontal: Spacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  searchName:     { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.text },
  searchSub:      { fontSize: Typography.sizes.xs, color: Colors.textMuted },

  // Form rows
  formRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 8 },
  formLabel:  { flex: 1, fontSize: 13, color: '#333' },
  amountWrap: { flexDirection:'row', alignItems:'center', width:180, borderWidth:1, borderColor:'#ccc', borderRadius:2, overflow:'hidden', backgroundColor:'#fff' },
  inputFlex:  { flex:1, paddingHorizontal:8, paddingVertical:7, fontSize:13, color:'#1a1a1a' },
  suffix:     { paddingHorizontal:6, color:'#888', borderLeftWidth:1, borderLeftColor:'#ccc', fontSize:11, paddingVertical:9 },
  inputFixed: { width:180, borderWidth:1, borderColor:'#ccc', borderRadius:2, paddingHorizontal:8, paddingVertical:7, fontSize:13, color:'#1a1a1a', backgroundColor:'#fff' },
  inputReadOnly: { backgroundColor:'#f0f0f0', color:'#555' },
  input:      { borderWidth:1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal:12, paddingVertical:10, fontSize:13, color: Colors.text, backgroundColor: Colors.surfaceAlt },

  // Chips
  chipRow:        { flexDirection:'row', flexWrap:'wrap', gap:6 },
  chip:           { paddingHorizontal:12, paddingVertical:6, borderRadius:2, borderWidth:1, borderColor:'#ccc', backgroundColor:'#f5f5f5' },
  chipActive:     { backgroundColor:'#1a3048', borderColor:'#1a3048' },
  chipText:       { fontSize:12, color:'#333' },
  chipTextActive: { color:'#fff', fontWeight:'600' },

  hintRow:  { paddingHorizontal: Spacing.base, paddingBottom: 4 },
  hintText: { fontSize: 11, color: '#c0392b', fontStyle: 'italic' },

  // Warnings
  warning:      { marginHorizontal: Spacing.base, borderRadius: Radius.sm, padding: Spacing.md },
  warningText:  { fontSize: 13, color: '#1a1a1a', lineHeight: 20 },
  warningBold:  { fontWeight: '700', textDecorationLine: 'underline' },
  errorBox:     { marginHorizontal: Spacing.base, backgroundColor: '#fde8e8', borderWidth: 1, borderColor: '#f5c6c6', borderRadius: Radius.sm, padding: Spacing.md },
  errorText:    { fontSize: 12, color: '#b00000' },

  // Summary strip
  summaryCard:         { marginHorizontal: Spacing.base, borderWidth: 1, borderColor: '#c3e6cb', borderRadius: Radius.sm, overflow: 'hidden' },
  summaryHeader:       { padding: 10 },
  summaryHeaderText:   { fontSize: 13, fontWeight: '700', color: '#155724' },
  summaryRow:          { flexDirection: 'row' },
  summaryItem:         { flex: 1, padding: 12 },
  summaryItemBorder:   { borderRightWidth: 1, borderRightColor: '#c3e6cb' },
  summaryLabel:        { fontSize: 11, color: '#555', marginBottom: 4 },
  summaryValue:        { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },

  // Schedule
  scheduleCard:       { marginHorizontal: Spacing.base, borderWidth: 1, borderColor: '#b0c4d8', overflow: 'hidden' },
  scheduleTitleBar:   { backgroundColor: '#c9d8e8', paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#b0c4d8' },
  scheduleTitleText:  { fontSize: 12, fontWeight: '700', color: '#1a1a1a', letterSpacing: 0.3 },
  schRow:             { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#d0e8f0' },
  schCell:            { fontSize: 11, color: '#1a1a1a', paddingHorizontal: 8, paddingVertical: 6, borderRightWidth: 1, borderRightColor: '#d0e8f0' },
  schHeaderText:      { color: '#fff', fontWeight: '600' },

  // Submit
  submitBtn:  { backgroundColor: '#27ae60', marginHorizontal: Spacing.base, borderRadius: Radius.sm, paddingVertical: 14, alignItems: 'center', ...Shadow.md },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.5 },
});
