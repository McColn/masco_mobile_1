import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Modal,
  ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { StatsBanner } from '@/components/ui/StatsBanner';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { LoanService } from '@/lib/services';
import { formatTZS, formatDate, getTodayLocal, formatAmountCommas } from '@/lib/format';
import { useBranchStore } from '@/store/branchStore';
import { useDebounce } from '@/hooks/useDebounce';
import { DateInput } from '@/components/ui/DateInput';

const METHODS = [
  { value: 'cash',         label: '💵 Cash' },
  { value: 'bank_transfer',label: '🏦 Bank' },
  { value: 'mobile_money', label: '📱 Mobile' },
];

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Smart default: ≤18 → prev month, ≥19 → current month ──────────────────
function getDefaultPayMonth(): { value: string; reason: string } {
  const today = new Date();
  const day   = today.getDate();
  let year  = today.getFullYear();
  let month = today.getMonth() + 1;          // 1-based (current month)

  if (day <= 18) {
    // Day ≤ 18: use PREVIOUS month
    month -= 1;
    if (month === 0) { month = 12; year -= 1; }
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return {
      value: `${year}-${String(month).padStart(2,'0')}`,
      reason: `Day ${day} ≤ 18 → Previous month (${MONTHS[month-1]} ${year})`,
    };
  } else {
    // Day ≥ 19: use CURRENT month
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return {
      value: `${year}-${String(month).padStart(2,'0')}`,
      reason: `Day ${day} ≥ 19 → Current month (${MONTHS[month-1]} ${year})`,
    };
  }
}

// Generate selectable months from first repayment date up to NEXT month
// Always includes at least: previous month, current month, next month
function getRepaymentMonths(firstRepaymentDate: string | null): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = [];
  const today = new Date();

  // End = current month (always include current month in list)
  const end = new Date(today.getFullYear(), today.getMonth(), 1);

  // Start = first repayment month OR 12 months ago (whichever is earlier)
  // Also ensure we always include the previous month
  const twelveMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 12, 1);
  const loanStart = firstRepaymentDate ? new Date(firstRepaymentDate) : twelveMonthsAgo;
  const start = loanStart < twelveMonthsAgo ? loanStart : twelveMonthsAgo;

  let cur = new Date(start.getFullYear(), start.getMonth(), 1);

  while (cur <= end) {
    const y = cur.getFullYear();
    const m = cur.getMonth() + 1;
    months.push({
      value: `${y}-${String(m).padStart(2,'0')}`,
      label: `${MONTH_NAMES[m-1]}/${y}`,
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return months.reverse();   // newest first — current month at top
}

// ── Payment Modal ──────────────────────────────────────────────────────────
function PaymentModal({ loan, onClose, onSuccess }: {
  loan: any; onClose: () => void; onSuccess: () => void;
}) {
  const [amount,   setAmount]   = useState(
    loan?.monthly_installment ? formatAmountCommas(String(loan.monthly_installment)) : ''
  );
  const [method,   setMethod]   = useState('cash');
  const defaultMonth = getDefaultPayMonth();
  const [payMonth, setPayMonth] = useState(defaultMonth.value);
  const payMonthReason = defaultMonth.reason;
  const [payDate,  setPayDate]  = useState(getTodayLocal());

  const months = getRepaymentMonths(loan?.first_repayment_date);

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      // Django accepts: amount/repayment_amount, payment_method/transaction_method
      // payment_month must be a full date YYYY-MM-DD (first of month)
      // Strip commas from formatted amount before sending — DecimalField
      // rejects strings like "5,000"
      const rawAmount = amount.replace(/,/g, '');
      const paymentMonthDate = `${payMonth}-01`;
      return LoanService.addRepayment(loan.id, {
        amount:             rawAmount,
        repayment_amount:   rawAmount,
        payment_method:     method,
        transaction_method: method,
        payment_date:       payDate,
        repayment_date:     payDate,
        payment_month:      paymentMonthDate,
      } as any);
    },
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Payment Recorded', text2: `${formatTZS(Number(amount.replace(/,/g, '')))} saved.` });
      onSuccess();
      onClose();
    },
    onError: (e: any) => {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.amount?.[0] ||
        JSON.stringify(e?.response?.data) ||
        'Error recording payment. Check amount and try again.';
      Toast.show({ type: 'error', text1: 'Payment Failed', text2: msg, visibilityTime: 5000 });
      console.error('[PAYMENT]', e?.response?.status, e?.response?.data);
    },
  });

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Record Payment</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Client info */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Client</Text>
                <Text style={styles.infoValue}>{loan.client_name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Loan Type</Text>
                <Text style={styles.infoValue}>{loan.loan_type || '—'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Monthly Installment</Text>
                <Text style={[styles.infoValue, { color: Colors.primary }]}>{formatTZS(Number(loan.monthly_installment))}</Text>
              </View>
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.infoLabel}>Outstanding</Text>
                <Text style={[styles.infoValue, { color: Colors.error }]}>{formatTZS(Number(loan.repayment_amount_remaining))}</Text>
              </View>
            </View>

            {/* Amount */}
            <Text style={styles.fieldLabel}>Amount (TZS) *</Text>
            <TextInput
              style={styles.fieldInput}
              value={amount}
              onChangeText={v => setAmount(formatAmountCommas(v))}
              keyboardType="numeric"
              placeholder="Enter amount"
              placeholderTextColor={Colors.textMuted}
            />

            {/* Payment Method */}
            <Text style={styles.fieldLabel}>Payment Method</Text>
            <View style={styles.chipRow}>
              {METHODS.map(m => (
                <TouchableOpacity
                  key={m.value}
                  style={[styles.chip, method === m.value && styles.chipActive]}
                  onPress={() => setMethod(m.value)}
                >
                  <Text style={[styles.chipText, method === m.value && styles.chipTextActive]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Payment Month */}
            <Text style={styles.fieldLabel}>Payment Month</Text>
            <View style={styles.monthReasonBadge}>
              <Text style={styles.monthReasonText}>📅 Auto: {payMonthReason}</Text>
            </View>
            {/* Show currently selected month clearly */}
            {(() => {
              const sel = months.find(m => m.value === payMonth);
              return sel ? (
                <View style={styles.selectedMonthBadge}>
                  <Text style={styles.selectedMonthLabel}>Selected: </Text>
                  <Text style={styles.selectedMonthValue}>{sel.label}</Text>
                </View>
              ) : null;
            })()}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll}>
              {months.map(m => (
                <TouchableOpacity
                  key={m.value}
                  style={[styles.monthChip, payMonth === m.value && styles.chipActive]}
                  onPress={() => setPayMonth(m.value)}
                >
                  <Text style={[styles.chipText, payMonth === m.value && styles.chipTextActive]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Transaction Date */}
            <Text style={styles.fieldLabel}>Transaction Date</Text>
            <DateInput value={payDate} onChange={setPayDate} style={styles.fieldInput} />

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, isPending && { opacity: 0.7 }]}
              onPress={() => mutate()}
              disabled={isPending || !amount}
            >
              <Text style={styles.submitText}>
                {isPending ? 'Saving...' : `✓  Confirm Payment`}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────
export default function LoanPaymentScreen() {
  const [search, setSearch]           = useState('');
  const [activeModal, setActiveModal] = useState<any>(null);
  const [loanTypeSel, setLoanTypeSel] = useState<{clientId:number; loanId:number|null}>({clientId:0, loanId:null});
  const debouncedSearch = useDebounce(search, 300);
  const { selectedBranch } = useBranchStore();
  const qc = useQueryClient();

  // Mirrors the web loan_payment_page view: status='Approved',
  // repayment_amount_remaining>0, grouped by client. Search is applied
  // server-side and hits firstname, middlename, lastname, phone, check no,
  // and employment card no — all the fields the web dropdown searches.
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['loan-payment-clients', selectedBranch?.id, debouncedSearch],
    queryFn: () => LoanService.paymentClients({ search: debouncedSearch }),
  });

  const clients: any[] = data?.results ?? [];
  const totalOutstanding = clients.reduce(
    (s, c) => s + c.loans.reduce((ss:number, l:any) => ss + Number(l.repayment_amount_remaining || 0), 0),
    0
  );
  const totalActiveLoans = clients.reduce((s, c) => s + c.loans.length, 0);

  return (
    <ScreenLayout title="Loan Payment" showBack>
      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text>🔍 </Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search client or phone..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ color: Colors.textMuted }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <StatsBanner stats={[
        { label: 'Active Loans', value: String(totalActiveLoans), color: Colors.primary },
        { label: 'Outstanding',  value: formatTZS(totalOutstanding), color: Colors.error },
      ]} />

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={clients}
          keyExtractor={c => String(c.client_id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {debouncedSearch
                ? `No active loans found for "${debouncedSearch}".`
                : 'No active loans in this branch.'}
            </Text>
          }
          renderItem={({ item: client }) => {
            const isMulti = client.has_multiple;
            // Selected loan for this client: honour user selection, otherwise
            // default to the primary (first) loan — matches the web behaviour
            // where clicking a single-loan client immediately reveals Proceed.
            const selectedLoanId =
              loanTypeSel.clientId === client.client_id && loanTypeSel.loanId
                ? loanTypeSel.loanId
                : client.primary_loan_id;
            const selectedLoan = client.loans.find((l:any) => l.id === selectedLoanId) ?? client.loans[0];
            const canPay = !isMulti || (loanTypeSel.clientId === client.client_id && !!loanTypeSel.loanId);

            const initials = client.client_name
              ?.split(' ').filter(Boolean).map((n:string)=>n[0]).join('').slice(0,2) || '??';

            return (
              <View style={styles.loanRow}>
                <View style={styles.loanTop}>
                  <View style={styles.loanAvatar}>
                    <Text style={styles.loanAvatarText}>{initials}</Text>
                  </View>
                  <View style={styles.loanInfo}>
                    <Text style={styles.loanName} numberOfLines={1}>{client.client_name}</Text>
                    <Text style={styles.loanPhone}>
                      {client.check_no ? `[${client.check_no}]` : ''}{client.check_no && client.phone ? ' • ' : ''}{client.phone || ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.payBtn, !canPay && { backgroundColor: Colors.textMuted }]}
                    onPress={() => {
                      if (!canPay) return;
                      setActiveModal({
                        ...selectedLoan,
                        client_name:  client.client_name,
                        client_phone: client.phone,
                      });
                    }}
                    activeOpacity={0.8}
                    disabled={!canPay}
                  >
                    <Text style={styles.payBtnText}>Pay</Text>
                  </TouchableOpacity>
                </View>

                {/* Loan type selector — shown only when client has 2+ active loans */}
                {isMulti && (
                  <View style={styles.loanTypeBox}>
                    <Text style={styles.loanTypeLabel}>Select loan to pay:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                      {client.loans.map((l:any) => {
                        const active = selectedLoanId === l.id
                          && loanTypeSel.clientId === client.client_id
                          && loanTypeSel.loanId === l.id;
                        return (
                          <TouchableOpacity
                            key={l.id}
                            style={[styles.chip, active && styles.chipActive]}
                            onPress={() => setLoanTypeSel({ clientId: client.client_id, loanId: l.id })}
                          >
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>
                              {l.loan_type}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                <View style={styles.loanAmounts}>
                  <View>
                    <Text style={styles.amtLabel}>Installment</Text>
                    <Text style={styles.amtVal}>{formatTZS(Number(selectedLoan.monthly_installment))}</Text>
                  </View>
                  <View>
                    <Text style={styles.amtLabel}>Outstanding</Text>
                    <Text style={[styles.amtVal, { color: Colors.error }]}>{formatTZS(Number(selectedLoan.repayment_amount_remaining))}</Text>
                  </View>
                  <View>
                    <Text style={styles.amtLabel}>Type</Text>
                    <Text style={styles.amtVal}>{selectedLoan.loan_type || '—'}</Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Payment modal */}
      {activeModal && (
        <PaymentModal
          loan={activeModal}
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['loan-payment-list'] });
            qc.invalidateQueries({ queryKey: ['loans'] });
            setActiveModal(null);
          }}
        />
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  searchRow: { padding: Spacing.base, paddingBottom: Spacing.sm },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, height: 44, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  searchInput: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.text },
  list: { padding: Spacing.base, paddingTop: 0, paddingBottom: 40, gap: Spacing.sm },
  loanRow: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  loanTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 10 },
  loanAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primary+'18', alignItems: 'center', justifyContent: 'center' },
  loanAvatarText: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
  loanInfo: { flex: 1 },
  loanName: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.text },
  loanPhone: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  payBtn: { backgroundColor: Colors.success, borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 8 },
  payBtnText: { color: '#fff', fontWeight: Typography.weights.bold, fontSize: Typography.sizes.sm },
  loanAmounts: { flexDirection: 'row', justifyContent: 'space-between' },
  loanTypeBox: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: 8, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  loanTypeLabel: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 },
  amtLabel: { fontSize: 10, color: Colors.textMuted },
  amtVal: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.text, marginTop: 1 },
  empty: { textAlign: 'center', color: Colors.textMuted, padding: 40 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.text },
  modalClose: { fontSize: 18, color: Colors.textMuted, padding: 4 },
  modalBody: { padding: Spacing.base },
  infoCard: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { fontSize: Typography.sizes.sm, color: Colors.textMuted },
  infoValue: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.text },
  fieldLabel: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, color: Colors.textSecondary, marginTop: 14, marginBottom: 6 },
  fieldHint: { fontSize: Typography.sizes.xs, color: Colors.textMuted, fontWeight: Typography.weights.regular },
  fieldInput: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 10, fontSize: Typography.sizes.base, color: Colors.text, backgroundColor: Colors.surfaceAlt },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, fontWeight: Typography.weights.medium },
  chipTextActive: { color: '#fff', fontWeight: Typography.weights.semibold },
  monthReasonBadge: { backgroundColor: Colors.primary+'10', borderRadius: Radius.md, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: Colors.primary+'25' },
  selectedMonthBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.successLight, borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8, borderWidth: 1, borderColor: Colors.success+'40' },
  selectedMonthLabel: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  selectedMonthValue: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.success },
  monthReasonText: { fontSize: Typography.sizes.xs, color: Colors.primary, fontWeight: Typography.weights.semibold },
  monthScroll: { marginBottom: 8 },
  monthChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt, marginRight: 6 },
  submitBtn: { backgroundColor: Colors.success, borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center', marginTop: 20, marginBottom: 30 },
  submitText: { color: '#fff', fontWeight: Typography.weights.bold, fontSize: Typography.sizes.base },
});
