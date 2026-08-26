// Loans Owed Report — memory-optimised for Android
// Renders ONE section at a time via tab selector to avoid OOM
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Alert, FlatList,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { useBranchStore } from '@/store/branchStore';
import api from '@/lib/api';

const NAVY    = '#0d1b2e';
const NAVY_H  = '#0d4a7a';
const GOLD    = '#d4b97a';
const GOLD_B  = '#b89650';
const GREEN   = '#27ae60';
const RED_CELL= '#96534a';

const W_SN    = 30; const W_NAME  = 140; const W_CHECK = 82; const W_LOAN = 88;
const W_PAID  = 58; const W_OUT   = 58;
const W_TOTAL = 88; const W_LOANED= 88; const W_AMOUNT= 88;
const W_BAL   = 82; const W_MOB   = 100; const W_SEL  = 44;

function fmtN(v: any): string {
  const n = Number(v) || 0;
  return n === 0 ? '0' : Math.round(n).toLocaleString('en-US');
}

// ── Single cell — inline to avoid per-cell component overhead ─────────────
function renderCell(cell: any, ci: number) {
  const p = (style: any, val: string) => (
    <Text key={`p${ci}`} style={[ss.td, style, { width: W_PAID }]}>{val}</Text>
  );
  const o = (style: any, val: string) => (
    <Text key={`o${ci}`} style={[ss.td, style, { width: W_OUT }]}>{val}</Text>
  );

  switch (cell.type) {
    case 'tick':       return [p(ss.tdPaid, cell.paid ? fmtN(cell.paid) : ''), o(ss.tdTick, '✓')];
    case 'tick_no_paid':return [p(ss.tdPaid, ''), o(ss.tdTick, '✓')];
    case 'tick_out':   return [p(ss.tdPaid, cell.paid ? fmtN(cell.paid) : ''), o(ss.tdTick, '✓')];
    case 'partial':    return [p(ss.tdPaid, cell.paid ? fmtN(cell.paid) : ''), o(ss.tdOut, fmtN(cell.out))];
    case 'out_only':   return [p(ss.tdPaid, ''), o(ss.tdOut, fmtN(cell.out))];
    case 'future_out': return [p(ss.tdEmpty, ''), o(ss.tdEmpty, fmtN(cell.out))];
    case 'extra_paid': return [p(ss.tdPaid, fmtN(cell.paid)), o(ss.tdEmpty, '')];
    default:           return [p(ss.tdEmpty, ''), o(ss.tdEmpty, '')];
  }
}

// ── Section table — renders a single month/hama section ──────────────────
function SectionTable({ section, isHama, onApprove, approving }: {
  section: any; isHama?: boolean;
  onApprove: (ids: number[]) => void; approving: boolean;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const headers: string[] = section.month_headers ?? [];
  const rows: any[]       = section.rows ?? [];
  const colTotals: any[]  = section.col_totals ?? [];

  const eligibleIds = useMemo(
    () => rows.filter((r: any) => r.is_fully_paid || Number(r.balance) <= 0).map((r: any) => r.loan_id),
    [rows]
  );
  const allSelected = eligibleIds.length > 0 && eligibleIds.every((id: number) => selected.has(id));

  const toggle = (id: number, ok: boolean) => {
    if (!ok) return;
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleApprove = () => {
    if (!selected.size) { Toast.show({ type: 'error', text1: 'No loans selected.' }); return; }
    Alert.alert('Approve', `Approve ${selected.size} loan(s)?`,
      [{ text: 'Cancel', style: 'cancel' },
       { text: 'Approve', onPress: () => { onApprove([...selected]); setSelected(new Set()); } }]);
  };

  // Render row — extracted as function so FlatList doesn't recreate component
  const renderRow = ({ item: row, index: i }: { item: any; index: number }) => {
    const eligible   = row.is_fully_paid || Number(row.balance) <= 0;
    const isSel      = selected.has(row.loan_id);
    const cells: any[]= row.cells ?? [];

    return (
      <TouchableOpacity
        style={[ss.row, i % 2 === 1 && ss.rowAlt, isSel && ss.rowSel]}
        onPress={() => toggle(row.loan_id, eligible)}>
        <Text style={[ss.td, { width: W_SN,    textAlign: 'center', color: Colors.textMuted }]}>{i+1}</Text>
        <Text style={[ss.td, { width: W_NAME,  fontWeight: '500' }]} numberOfLines={1}>{row.name}</Text>
        <Text style={[ss.td, { width: W_CHECK, color: Colors.textMuted }]}>{row.check_no}</Text>
        <Text style={[ss.td, { width: W_LOAN,  color: '#2471a3', fontSize: 9 }]}>{row.loan_id_label}</Text>
        {cells.map((cell: any, ci: number) => renderCell(cell, i * 100 + ci))}
        <Text style={[ss.td, { width: W_TOTAL,  textAlign: 'right' }]}>{fmtN(row.total_paid)}</Text>
        <Text style={[ss.td, { width: W_LOANED, textAlign: 'right' }]}>{fmtN(row.loaned_amount)}</Text>
        {isHama && <Text style={[ss.td, { width: W_AMOUNT, textAlign: 'right', color: Colors.textMuted }]}>{fmtN(row.interest)}</Text>}
        <Text style={[ss.td, { width: W_AMOUNT, textAlign: 'right' }]}>{fmtN(row.total_amount)}</Text>
        {eligible
          ? <Text style={[ss.td, { width: W_BAL, textAlign: 'center', color: GREEN, fontWeight: '900' }]}>✓ ✓</Text>
          : <Text style={[ss.td, { width: W_BAL, textAlign: 'right',  fontWeight: '600' }]}>{fmtN(row.balance)}</Text>}
        <Text style={[ss.td, { width: W_MOB, color: Colors.textMuted, fontSize: 9 }]}>{row.mobile}</Text>
        <View style={[ss.td, { width: W_SEL, alignItems: 'center', justifyContent: 'center', backgroundColor: eligible ? '#eaf4fb' : '#f5f5f5' }]}>
          {eligible
            ? <View style={[ss.cb, isSel && ss.cbOn]}>{isSel && <Text style={ss.cbTick}>✓</Text>}</View>
            : <View style={[ss.cb, { opacity: 0.25 }]} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={ss.section}>
      <Text style={ss.monthTitle}>{section.label}
        <Text style={ss.countBadge}>  {section.count} loan{section.count !== 1 ? 's' : ''}</Text>
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          {/* Header row 1 — month name groups */}
          <View style={[ss.row, ss.thead]}>
            <Text style={[ss.th, { width: W_SN }]}>S/N</Text>
            <Text style={[ss.th, { width: W_NAME }]}>Name</Text>
            <Text style={[ss.th, { width: W_CHECK }]}>Check No</Text>
            <Text style={[ss.th, { width: W_LOAN }]}>Loan ID</Text>
            {headers.map((h, i) => (
              <View key={i} style={{ width: W_PAID + W_OUT, borderRightWidth: 1, borderRightColor: '#4a6a8a' }}>
                <Text style={[ss.th, { textAlign: 'center' }]}>{h}</Text>
              </View>
            ))}
            <Text style={[ss.th, { width: W_TOTAL  }]}>Total Paid</Text>
            <Text style={[ss.th, { width: W_LOANED }]}>Loaned Amt</Text>
            {isHama && <Text style={[ss.th, { width: W_AMOUNT }]}>Interest</Text>}
            <Text style={[ss.th, { width: W_AMOUNT }]}>Total Amt</Text>
            <Text style={[ss.th, { width: W_BAL    }]}>Balance</Text>
            <Text style={[ss.th, { width: W_MOB    }]}>Mobile</Text>
            <Text style={[ss.th, { width: W_SEL, backgroundColor: '#2471a3', textAlign: 'center' }]}>Sel</Text>
          </View>

          {/* Header row 2 — Paid / Out sub-headers */}
          <View style={[ss.row, { backgroundColor: '#0a3a64' }]}>
            <View style={{ width: W_SN + W_NAME + W_CHECK + W_LOAN }} />
            {headers.map((_, i) => (
              <React.Fragment key={i}>
                <Text style={[ss.subTh, { width: W_PAID, backgroundColor: GREEN }]}>Paid</Text>
                <Text style={[ss.subTh, { width: W_OUT,  borderRightWidth: 1, borderRightColor: '#4a6a8a' }]}>Out</Text>
              </React.Fragment>
            ))}
            <View style={{ width: W_TOTAL + W_LOANED + (isHama ? W_AMOUNT : 0) + W_AMOUNT + W_BAL + W_MOB + W_SEL }} />
          </View>

          {/* Data rows via FlatList — only renders visible rows */}
          <FlatList
            data={rows}
            keyExtractor={(row: any) => String(row.loan_id)}
            renderItem={renderRow}
            scrollEnabled={false}
            removeClippedSubviews
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={5}
            getItemLayout={(_, index) => ({ length: 36, offset: 36 * index, index })}
          />

          {/* Grand total */}
          <View style={[ss.row, ss.grandRow]}>
            <Text style={[ss.td, ss.grandTd, { width: W_SN + W_NAME + W_CHECK + W_LOAN }]}>GRAND TOTAL</Text>
            {colTotals.map((ct: any, i: number) => (
              <React.Fragment key={i}>
                <Text style={[ss.td, ss.grandTd, { width: W_PAID, textAlign: 'right' }]}>{fmtN(ct.paid)}</Text>
                <Text style={[ss.td, ss.grandTd, { width: W_OUT,  textAlign: 'right', borderRightWidth: 1, borderRightColor: GOLD_B }]}>{fmtN(ct.out)}</Text>
              </React.Fragment>
            ))}
            <Text style={[ss.td, ss.grandTd, { width: W_TOTAL,  textAlign: 'right' }]}>{fmtN(section.total_paid)}</Text>
            <Text style={[ss.td, ss.grandTd, { width: W_LOANED, textAlign: 'right' }]}>{fmtN(section.total_loaned)}</Text>
            {isHama && <Text style={[ss.td, ss.grandTd, { width: W_AMOUNT, textAlign: 'right' }]}>{fmtN(section.total_interest)}</Text>}
            <Text style={[ss.td, ss.grandTd, { width: W_AMOUNT, textAlign: 'right' }]}>{fmtN(section.total_amount)}</Text>
            <Text style={[ss.td, ss.grandTd, { width: W_BAL,    textAlign: 'right' }]}>{fmtN(section.total_balance)}</Text>
            <Text style={[ss.td, { width: W_MOB + W_SEL }]}> </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action buttons */}
      <View style={ss.actionRow}>
        {eligibleIds.length >= 2 && (
          <TouchableOpacity style={[ss.selectBtn, allSelected && ss.deselectBtn]}
            onPress={() => allSelected ? setSelected(new Set()) : setSelected(new Set(eligibleIds))}>
            <Text style={[ss.selectTxt, allSelected && { color: '#333' }]}>
              {allSelected ? 'DESELECT ALL' : 'SELECT ALL'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[ss.approveBtn, (selected.size === 0 || approving) && { opacity: 0.5 }]}
          onPress={handleApprove} disabled={selected.size === 0 || approving}>
          <Text style={ss.approveTxt}>APPROVE SELECTED LOANS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────
export default function LoansOwedScreen() {
  const { selectedBranch } = useBranchStore();
  const qc = useQueryClient();
  // activeTab: index into allSections array — renders ONE section at a time
  const [activeTab, setActiveTab] = useState(0);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['loans-owed-report', selectedBranch?.id],
    queryFn: () => api.get('/loans-owed/report/', { timeout: 120000 } as any).then(r => r.data),
    retry: 1,
    gcTime: 60 * 1000, // free memory after 1 min for this heavy dataset
  });

  const { mutate: approveLoanIds, isPending: approving } = useMutation({
    mutationFn: (ids: number[]) => api.post('/loans-owed/approve/', { loan_ids: ids }).then(r => r.data),
    onSuccess: (res: any) => {
      Toast.show({ type: 'success', text1: 'Approved', text2: res.message });
      qc.invalidateQueries({ queryKey: ['loans-owed-report'] });
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: 'Failed', text2: e?.response?.data?.detail ?? 'Approval failed.' }),
  });

  const monthSections: any[] = data?.month_sections ?? [];
  const hamaSections:  any[] = data?.hama_sections  ?? [];
  const branchName = data?.branch_name ?? selectedBranch?.name?.toUpperCase() ?? '';

  // All sections combined — month sections first then HAMA
  const allSections = useMemo(() => [
    ...monthSections.map((s: any) => ({ ...s, isHama: false })),
    ...hamaSections.map( (s: any) => ({ ...s, isHama: true  })),
  ], [monthSections, hamaSections]);

  const activeSection = allSections[activeTab] ?? null;

  return (
    <ScreenLayout title="Loans Owed" subtitle={selectedBranch?.name} showBack>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Letterhead */}
        <View style={ss.letterhead}>
          <Text style={ss.companyName}>MASCO FINANCE CO. LTD</Text>
          <Text style={ss.companySub}>P.O.BOX 30474—KIBAHA | TANZANIA</Text>
          <Text style={ss.companyContact}>Mobile: +255 718 544 515; Email: mascofinance@gmail.com</Text>
        </View>
        <Text style={ss.branchTitle}>{branchName} BRANCH</Text>
        <Text style={ss.reportTitle}>CASH REPAYMENT LOANS OWED REPORT</Text>

        {isLoading && (
          <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Loading loans owed data...</Text>
            <Text style={{ color: Colors.textMuted, fontSize: 11 }}>This may take a moment</Text>
          </View>
        )}

        {isError && !isLoading && (
          <View style={ss.emptyBox}>
            <Text style={{ fontSize: 28 }}>⚠️</Text>
            <Text style={{ color: Colors.error, fontWeight: '600', marginTop: 8 }}>Failed to load</Text>
            <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 }}>
              {(error as any)?.response?.data?.detail ?? (error as any)?.message ?? 'Network error'}
            </Text>
          </View>
        )}

        {data && allSections.length === 0 && (
          <View style={ss.emptyBox}>
            <Text style={{ fontSize: 36 }}>✅</Text>
            <Text style={ss.emptyTitle}>No active loans owed</Text>
          </View>
        )}

        {data && allSections.length > 0 && (
          <>
            {/* Section tab selector — ONE section rendered at a time to save memory */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={{ paddingHorizontal: Spacing.base, marginBottom: Spacing.sm }}>
              <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 8 }}>
                {allSections.map((s: any, i: number) => (
                  <TouchableOpacity key={s.key ?? i}
                    style={[ss.tab, activeTab === i && ss.tabActive]}
                    onPress={() => setActiveTab(i)}>
                    <Text style={[ss.tabText, activeTab === i && ss.tabTextActive]}>{s.label}</Text>
                    {s.count > 0 && (
                      <View style={[ss.tabBadge, s.isHama && { backgroundColor: Colors.error }]}>
                        <Text style={ss.tabBadgeText}>{s.count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Only render the active section */}
            {activeSection && (
              <SectionTable
                key={activeSection.key}
                section={activeSection}
                isHama={activeSection.isHama}
                onApprove={approveLoanIds}
                approving={approving}
              />
            )}
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const ss = StyleSheet.create({
  letterhead:     { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: '#8b0000' },
  companyName:    { fontSize: 14, fontWeight: '900', color: '#2471a3', textTransform: 'uppercase' },
  companySub:     { fontSize: 10, color: '#1a1a1a', marginTop: 2 },
  companyContact: { fontSize: 9,  color: '#1a1a1a', marginTop: 1 },
  branchTitle:    { textAlign: 'center', fontSize: 13, fontWeight: '700', color: NAVY, textDecorationLine: 'underline', textTransform: 'uppercase', marginTop: 8 },
  reportTitle:    { textAlign: 'center', fontSize: 12, fontWeight: '900', color: NAVY, textDecorationLine: 'underline', textTransform: 'uppercase', marginBottom: 4 },

  // Tabs
  tab:            { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
  tabActive:      { backgroundColor: NAVY_H, borderColor: NAVY_H },
  tabText:        { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },
  tabTextActive:  { color: '#fff', fontWeight: '700' },
  tabBadge:       { backgroundColor: GREEN, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText:   { color: '#fff', fontSize: 9, fontWeight: '700' },

  // Section
  section:    { marginHorizontal: Spacing.base, marginBottom: Spacing.sm },
  monthTitle: { textAlign: 'center', fontSize: 12, fontWeight: '800', color: NAVY, textDecorationLine: 'underline', textTransform: 'uppercase', marginBottom: 6 },
  countBadge: { fontSize: 10, color: GREEN, fontWeight: '600' },

  // Table
  row:      { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  rowAlt:   { backgroundColor: '#f9fafb' },
  rowSel:   { backgroundColor: '#e8f5e9' },
  thead:    { backgroundColor: NAVY_H },
  grandRow: { backgroundColor: GOLD, borderTopWidth: 2, borderTopColor: GOLD_B },
  th:       { color: '#fff', fontWeight: '700', fontSize: 9, paddingVertical: 6, paddingHorizontal: 3, textTransform: 'uppercase' },
  subTh:    { color: '#fff', fontWeight: '700', fontSize: 9, textAlign: 'center', paddingVertical: 4, paddingHorizontal: 2 },
  td:       { fontSize: 10, color: Colors.text, paddingVertical: 5, paddingHorizontal: 3, borderRightWidth: 1, borderRightColor: '#e0e0e0' },
  grandTd:  { color: '#1a1a1a', fontWeight: '700', fontSize: 10 },

  // Cell types
  tdPaid:   { textAlign: 'right', fontWeight: '600' },
  tdTick:   { textAlign: 'center', color: GREEN, fontWeight: '900', fontSize: 12 },
  tdOut:    { textAlign: 'right', color: '#fff', backgroundColor: RED_CELL, fontWeight: '600' },
  tdEmpty:  { textAlign: 'right', color: Colors.textMuted },

  // Checkbox
  cb:    { width: 15, height: 15, borderRadius: 2, borderWidth: 1.5, borderColor: '#aaa', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  cbOn:  { backgroundColor: GREEN, borderColor: GREEN },
  cbTick:{ color: '#fff', fontSize: 9, fontWeight: '700' },

  // Actions
  actionRow:  { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.sm },
  selectBtn:  { backgroundColor: '#2471a3', borderWidth: 1, borderColor: '#1a5c8a', borderRadius: 2, paddingHorizontal: 12, paddingVertical: 6 },
  deselectBtn:{ backgroundColor: '#fff', borderColor: '#888' },
  selectTxt:  { color: '#fff', fontSize: 11, fontWeight: '700' },
  approveBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#888', borderRadius: 2, paddingHorizontal: 14, paddingVertical: 6 },
  approveTxt: { color: '#333', fontSize: 11, fontWeight: '700' },

  emptyBox:   { alignItems: 'center', paddingTop: 50, gap: Spacing.sm },
  emptyTitle: { fontSize: Typography.sizes.base, fontWeight: '600', color: Colors.text },
});
