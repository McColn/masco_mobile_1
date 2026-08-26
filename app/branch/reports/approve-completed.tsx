// Approve Completed Loans — mirrors completed_loans_approval() web view exactly
// Screenshot: dark navy (#0d4a7a) header, section grouped by month with navy badge,
// SECTION TOTAL (gold), SELECT ALL + ✓ APPROVE SELECTED buttons
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { useBranchStore } from '@/store/branchStore';
import api from '@/lib/api';

// Exact colours from web template
const NAVY_HEADER = '#0d4a7a';   // .th-main background
const SEL_HEADER  = '#2471a3';   // .th-select background
const GOLD        = '#d4b97a';   // .cla-grand background
const GOLD_BORDER = '#b89650';
const GREEN       = '#27ae60';
const NAVY        = '#0d1b2e';

function fmtN(v: any): string {
  return Math.round(Number(v) || 0).toLocaleString('en-US');
}
function fmtDate(d: string): string {
  if (!d || d === '—') return '—';
  const p = d.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
}

// ── Section Component ─────────────────────────────────────────────────────
function Section({ section, onApprove, isPending }: {
  section: any;
  onApprove: (ids: number[]) => void;
  isPending: boolean;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggleOne = (id: number) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const allSelected = section.loans.length > 0 && selected.size === section.loans.length;

  const handleSelectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(section.loans.map((l: any) => l.id)));
  };

  const handleApprove = () => {
    if (selected.size === 0) {
      Toast.show({ type: 'error', text1: 'No loans selected.' });
      return;
    }
    Alert.alert(
      'Approve Loans',
      `Approve ${selected.size} loan(s) in ${section.label}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: '✓ Approve', style: 'default', onPress: () => onApprove([...selected]) },
      ]
    );
  };

  return (
    <View style={s.section}>
      {/* Month header — matches web: "JUNE 2026" + green count badge */}
      <View style={s.sectionHeaderRow}>
        <Text style={s.sectionLabel}>{section.label}</Text>
        <View style={s.countBadge}>
          <Text style={s.countText}>{section.count} LOAN{section.count !== 1 ? 'S' : ''}</Text>
        </View>
      </View>

      {/* Table — horizontal scroll */}
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={s.table}>
          {/* ── Column headers — dark navy matching web .th-main ── */}
          <View style={[s.row, s.thead]}>
            <Text style={[s.cell, s.th, { width: 36,  textAlign: 'center' }]}>S/N</Text>
            <Text style={[s.cell, s.th, { width: 170 }]}>Client Name</Text>
            <Text style={[s.cell, s.th, { width: 85,  textAlign: 'center' }]}>Check No</Text>
            <Text style={[s.cell, s.th, { width: 95,  textAlign: 'center' }]}>Loan ID</Text>
            <Text style={[s.cell, s.th, { width: 75,  textAlign: 'center' }]}>Office</Text>
            <Text style={[s.cell, s.th, { width: 82,  textAlign: 'center' }]}>Loan Date</Text>
            <Text style={[s.cell, s.th, { width: 82,  textAlign: 'center' }]}>Completed</Text>
            <Text style={[s.cell, s.th, { width: 55,  textAlign: 'center' }]}>Months</Text>
            <Text style={[s.cell, s.th, { width: 105, textAlign: 'right'  }]}>Loaned Amt</Text>
            <Text style={[s.cell, s.th, { width: 100, textAlign: 'right'  }]}>Interest</Text>
            <Text style={[s.cell, s.th, { width: 105, textAlign: 'right'  }]}>Total Repay</Text>
            <Text style={[s.cell, s.th, { width: 105, textAlign: 'right'  }]}>Total Paid</Text>
            <Text style={[s.cell, s.th, { width: 55,  textAlign: 'center' }]}>Status</Text>
            <Text style={[s.cell, s.th, { width: 110 }]}>Mobile</Text>
            {/* Select column — slightly lighter blue like web .th-select */}
            <Text style={[s.cell, { width: 50, textAlign: 'center', color: '#fff', fontWeight: '700', fontSize: 10, backgroundColor: SEL_HEADER, paddingVertical: 9 }]}>Select</Text>
          </View>

          {/* ── Data rows ── */}
          {section.loans.map((loan: any, i: number) => {
            const isSelected = selected.has(loan.id);
            return (
              <TouchableOpacity key={loan.id}
                style={[s.row, i % 2 === 1 && s.rowAlt, isSelected && s.rowSelected]}
                onPress={() => toggleOne(loan.id)}>
                <Text style={[s.cell, { width: 36, textAlign: 'center', color: Colors.textMuted }]}>{loan.sn ?? i+1}</Text>
                <Text style={[s.cell, { width: 170, fontWeight: '500' }]} numberOfLines={1}>{loan.client_name}</Text>
                <Text style={[s.cell, { width: 85,  textAlign: 'center', color: Colors.textMuted }]}>{loan.check_no}</Text>
                <Text style={[s.cell, { width: 95,  textAlign: 'center', color: '#2471a3', fontSize: 10 }]}>{loan.loan_id_label}</Text>
                <Text style={[s.cell, { width: 75,  textAlign: 'center', color: Colors.textMuted }]}>{loan.office}</Text>
                <Text style={[s.cell, { width: 82,  textAlign: 'center', color: Colors.textMuted }]}>{fmtDate(loan.loan_date)}</Text>
                <Text style={[s.cell, { width: 82,  textAlign: 'center', color: Colors.textMuted }]}>{fmtDate(loan.completion_date)}</Text>
                <Text style={[s.cell, { width: 55,  textAlign: 'center' }]}>{loan.months}</Text>
                <Text style={[s.cell, { width: 105, textAlign: 'right' }]}>{fmtN(loan.loan_amount)}</Text>
                <Text style={[s.cell, { width: 100, textAlign: 'right', color: Colors.textMuted }]}>{fmtN(loan.interest)}</Text>
                <Text style={[s.cell, { width: 105, textAlign: 'right' }]}>{fmtN(loan.total_repayment)}</Text>
                <Text style={[s.cell, { width: 105, textAlign: 'right', color: Colors.success, fontWeight: '600' }]}>{fmtN(loan.total_paid)}</Text>
                {/* Status — green double checkmark ✓ ✓ */}
                <View style={[s.cell, { width: 55, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: GREEN, fontWeight: '900', fontSize: 13 }}>✓ ✓</Text>
                </View>
                <Text style={[s.cell, { width: 110, color: Colors.textMuted }]}>{loan.mobile}</Text>
                {/* Checkbox */}
                <View style={[s.cell, { width: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eaf4fb' }]}>
                  <View style={[s.checkbox, isSelected && s.checkboxChecked]}>
                    {isSelected && <Text style={s.checkmark}>✓</Text>}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* ── SECTION TOTAL — gold matching .cla-grand ── */}
          <View style={[s.row, s.grandRow]}>
            <Text style={[s.cell, s.grandText, { width: 36+170+85+95+75+82+82+55 }]}>SECTION TOTAL</Text>
            <Text style={[s.cell, s.grandText, { width: 105, textAlign: 'right' }]}>{fmtN(section.total_loaned)}</Text>
            <Text style={[s.cell, s.grandText, { width: 100, textAlign: 'right' }]}>—</Text>
            <Text style={[s.cell, s.grandText, { width: 105, textAlign: 'right' }]}>{fmtN(section.total_repayment)}</Text>
            <Text style={[s.cell, s.grandText, { width: 105, textAlign: 'right' }]}>{fmtN(section.total_paid)}</Text>
            <Text style={[s.cell, { width: 55+110+50 }]}> </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Action buttons — matching web .approve-row ── */}
      <View style={s.actionRow}>
        {/* SELECT ALL / DESELECT ALL — shown when ≥ 2 loans (web hides for single) */}
        {section.loans.length >= 2 && (
          <TouchableOpacity style={[s.selectAllBtn, allSelected && s.deselectAllBtn]} onPress={handleSelectAll}>
            <Text style={[s.selectAllText, allSelected && { color: '#333' }]}>
              {allSelected ? 'DESELECT ALL' : 'SELECT ALL'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.approveBtn, selected.size === 0 && { opacity: 0.5 }]}
          onPress={handleApprove} disabled={isPending || selected.size === 0}>
          <Text style={s.approveBtnText}>✓ APPROVE SELECTED</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────
export default function ApproveCompletedScreen() {
  const { selectedBranch } = useBranchStore();
  const qc = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['completed-loans-approval', selectedBranch?.id],
    queryFn: () => api.get('/loans/completed-approval/').then(r => r.data),
    retry: 1,
  });

  const { mutate: approveLoanIds, isPending } = useMutation({
    mutationFn: (ids: number[]) =>
      api.post('/loans/completed-approval/approve/', { loan_ids: ids }).then(r => r.data),
    onSuccess: (res: any) => {
      const approved = res.approved ?? res.count ?? '?';
      Toast.show({ type: 'success', text1: '✅ Approved', text2: `${approved} loan(s) approved.` });
      qc.invalidateQueries({ queryKey: ['completed-loans-approval'] });
      qc.invalidateQueries({ queryKey: ['customer-report'] });
      qc.invalidateQueries({ queryKey: ['customer-loans-branch'] });
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: 'Failed', text2: e?.response?.data?.error ?? e?.response?.data?.detail ?? 'Approval failed.' }),
  });

  const sections: any[] = data?.sections ?? [];
  const branchName = data?.branch_name ?? selectedBranch?.name?.toUpperCase() ?? '';

  return (
    <ScreenLayout title="Approve Completed Loans" subtitle={selectedBranch?.name} showBack>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Letterhead — always visible, not gated on data */}
        <View style={s.letterhead}>
          <Text style={s.companyName}>MASCO FINANCE CO. LTD</Text>
          <Text style={s.companySub}>P.O.BOX 30474—KIBAHA | TANZANIA</Text>
          <Text style={s.companyContact}>Mobile: +255 718 544 515; Email: mascofinance@gmail.com</Text>
        </View>
        <Text style={s.branchTitle}>{branchName} BRANCH</Text>
        <Text style={s.reportTitle}>COMPLETED LOANS — PENDING APPROVAL</Text>

        {/* Loading spinner */}
        {isLoading && <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />}

        {/* Error state */}
        {isError && !isLoading && (
          <View style={s.emptyBox}>
            <Text style={{ fontSize: 32 }}>⚠️</Text>
            <Text style={s.emptyTitle}>Failed to load data</Text>
            <Text style={s.emptySubtitle}>
              {(error as any)?.response?.data?.detail
                ?? (error as any)?.response?.data?.error
                ?? (error as any)?.message
                ?? 'Check your connection.'}
            </Text>
            {(error as any)?.response?.data?.trace && (
              <Text style={{ fontSize: 9, color: '#999', marginTop: 8, paddingHorizontal: 16 }} numberOfLines={10}>
                {(error as any).response.data.trace}
              </Text>
            )}
          </View>
        )}

        {/* Empty state — no pending loans */}
        {data && !isLoading && sections.length === 0 && (
          <View style={s.emptyBox}>
            <Text style={{ fontSize: 36 }}>✅</Text>
            <Text style={s.emptyTitle}>No loans pending approval</Text>
            <Text style={s.emptySubtitle}>All completed loans have been approved.</Text>
          </View>
        )}

        {/* Sections */}
        {data && !isLoading && sections.map((section: any, i: number) => (
          <React.Fragment key={section.key ?? i}>
            {i > 0 && <View style={s.goldDivider} />}
            <Section section={section} onApprove={approveLoanIds} isPending={isPending} />
          </React.Fragment>
        ))}
      </ScrollView>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  // Letterhead
  letterhead:      { alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: '#8b0000', marginBottom: 8 },
  companyName:     { fontSize: 15, fontWeight: '900', color: '#2471a3', textTransform: 'uppercase' },
  companySub:      { fontSize: 11, color: '#1a1a1a', marginTop: 2 },
  companyContact:  { fontSize: 10, color: '#1a1a1a', marginTop: 2 },

  // Titles
  branchTitle:  { textAlign: 'center', fontSize: 13, fontWeight: '700', color: NAVY, textDecorationLine: 'underline', textTransform: 'uppercase', marginTop: 8 },
  reportTitle:  { textAlign: 'center', fontSize: 12, fontWeight: '900', color: NAVY, textDecorationLine: 'underline', textTransform: 'uppercase', marginBottom: 4 },

  goldDivider: { height: 2, backgroundColor: '#c8a84b', marginHorizontal: Spacing.base, marginVertical: Spacing.md },

  // Section
  section:         { marginHorizontal: Spacing.base, marginBottom: Spacing.sm },
  sectionHeaderRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  sectionLabel:    { fontSize: 13, fontWeight: '800', color: NAVY, textDecorationLine: 'underline', textTransform: 'uppercase', letterSpacing: 0.4 },
  countBadge:      { backgroundColor: GREEN, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 2 },
  countText:       { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Table
  table:       { overflow: 'hidden', borderWidth: 1, borderColor: '#bbb' },
  row:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: '#bbb' },
  rowAlt:      { backgroundColor: '#f5faff' },
  rowSelected: { backgroundColor: '#e8f5e9' },
  thead:       { backgroundColor: NAVY_HEADER, borderBottomWidth: 2, borderBottomColor: '#083a61' },
  grandRow:    { backgroundColor: GOLD, borderTopWidth: 2, borderTopColor: GOLD_BORDER, borderBottomWidth: 0 },
  cell:        { fontSize: 10.5, color: Colors.text, paddingHorizontal: 3 },
  th:          { color: '#fff', fontWeight: '700', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.2, paddingVertical: 7 },
  grandText:   { color: '#1a1a1a', fontWeight: '700', fontSize: 11 },

  // Checkbox
  checkbox:        { width: 16, height: 16, borderRadius: 2, borderWidth: 1.5, borderColor: '#aaa', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: GREEN, borderColor: GREEN },
  checkmark:       { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Action buttons
  actionRow:     { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.sm },
  selectAllBtn:  { backgroundColor: SEL_HEADER, borderWidth: 1, borderColor: '#1a5c8a', borderRadius: 2, paddingHorizontal: 14, paddingVertical: 7 },
  deselectAllBtn:{ backgroundColor: '#fff', borderColor: '#888' },
  selectAllText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  approveBtn:    { backgroundColor: GREEN, borderWidth: 1, borderColor: '#1e8449', borderRadius: 2, paddingHorizontal: 16, paddingVertical: 7 },
  approveBtnText:{ color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  // Empty
  emptyBox:      { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyTitle:    { color: Colors.text, fontSize: Typography.sizes.base, fontWeight: '600' },
  emptySubtitle: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
});
