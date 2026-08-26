// Monthly-Wise Loan Repayment — mirrors monthly_repayment_report() web view
// Screenshots: grouped by month, checkboxes, SELECT ALL / DESELECT ALL,
//   table: S/N | Transaction Date | Receipt No | Name | Check No | Loan ID | Description | Amount | edit
//   GRAND TOTAL row (gold), UPDATE PAYMENT MONTH FOR SELECTED bar at bottom
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { DateInput } from '@/components/ui/DateInput';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { useBranchStore } from '@/store/branchStore';
import { ReportService } from '@/lib/services';
import api from '@/lib/api';

const TEAL  = '#7de8e0';
const TEAL2 = '#5dd4cc';
const GOLD  = '#d4b97a';
const GOLDB = '#b89650';
const NAVY  = '#0d1b2e';
const PURPLE= '#9b59b6';
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtN(v: any) { return Math.round(Number(v)||0).toLocaleString('en-US'); }
function fmtDate(d: string) {
  if (!d) return '—';
  const p = d.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
}

// ── Month Section ─────────────────────────────────────────────────────────
function MonthSection({ section, branchName, onEdit }: {
  section: any; branchName: string;
  onEdit: (recordType: string, recordId: number) => void;
}) {
  const qc = useQueryClient();
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [updateDate, setUpdateDate] = useState('');

  const toggleOne = (rowKey: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(rowKey) ? n.delete(rowKey) : n.add(rowKey); return n; });
  const selectAll   = () => setSelected(new Set(section.rows.map((r: any) => r.row_key)));
  const deselectAll = () => setSelected(new Set());

  const { mutate: bulkUpdate, isPending } = useMutation({
    mutationFn: () => api.post('/monthly-repayment/bulk-update/', {
      selected_items:   [...selected],
      transaction_date: updateDate,
    }).then(r => r.data),
    onSuccess: (res: any) => {
      Toast.show({ type: 'success', text1: 'Updated', text2: res.message });
      setSelected(new Set()); setUpdateDate('');
      qc.invalidateQueries({ queryKey: ['monthly-repayment'] });
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: 'Failed', text2: e?.response?.data?.detail ?? 'Update failed.' }),
  });

  const handleUpdate = () => {
    if (selected.size === 0)  { Toast.show({ type: 'error', text1: 'No records selected.' }); return; }
    if (!updateDate)          { Toast.show({ type: 'error', text1: 'Enter a payment month date.' }); return; }
    Alert.alert('Update Payment Month',
      `Update payment month for ${selected.size} record(s) to ${fmtDate(updateDate)}?`,
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Update', onPress: () => bulkUpdate() }]
    );
  };

  return (
    <View style={s.section}>
      {/* Section title */}
      <Text style={s.monthTitle}>
        Monthly-Wise Loan Repayment For {section.label}
      </Text>

      {/* Select All / Deselect All */}
      <View style={s.selRow}>
        <TouchableOpacity style={s.selectAllBtn} onPress={selectAll}>
          <Text style={s.selectAllText}>Select All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.deselectBtn} onPress={deselectAll}>
          <Text style={s.deselectText}>Deselect All</Text>
        </TouchableOpacity>
      </View>

      {/* Table */}
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={s.table}>
          {/* Header */}
          <View style={[s.row, s.thead]}>
            <View style={[s.cell, { width: 34 }]} />
            <Text style={[s.cell, s.th, { width: 40,  textAlign: 'center' }]}>S/N</Text>
            <Text style={[s.cell, s.th, { width: 90  }]}>Transaction Date</Text>
            <Text style={[s.cell, s.th, { width: 80  }]}>Receipt No</Text>
            <Text style={[s.cell, s.th, { width: 175 }]}>Name</Text>
            <Text style={[s.cell, s.th, { width: 95  }]}>Check No.</Text>
            <Text style={[s.cell, s.th, { width: 100 }]}>Loan ID</Text>
            <Text style={[s.cell, s.th, { width: 180 }]}>Description</Text>
            <Text style={[s.cell, s.th, { width: 100, textAlign: 'right' }]}>Amount</Text>
            <Text style={[s.cell, s.th, { width: 40  }]}> </Text>
          </View>

          {/* Data rows */}
          {section.rows.map((r: any, i: number) => {
            const isSelected = selected.has(r.row_key);
            return (
              <TouchableOpacity key={r.row_key ?? i}
                style={[s.row, i % 2 === 1 && s.rowAlt, isSelected && s.rowSelected]}
                onPress={() => toggleOne(r.row_key)}>
                {/* Checkbox */}
                <View style={[s.cell, { width: 34, alignItems: 'center', justifyContent: 'center' }]}>
                  <View style={[s.checkbox, isSelected && s.checkboxChecked]}>
                    {isSelected && <Text style={s.checkmark}>✓</Text>}
                  </View>
                </View>
                <Text style={[s.cell, { width: 40,  textAlign: 'center', color: Colors.textMuted }]}>{i+1}</Text>
                <Text style={[s.cell, { width: 90  }]}>{fmtDate(r.date)}</Text>
                <Text style={[s.cell, { width: 80  }]}>{r.receipt_no}</Text>
                <Text style={[s.cell, { width: 175, textTransform: 'uppercase', fontWeight: '500' }]} numberOfLines={1}>{r.name}</Text>
                <Text style={[s.cell, { width: 95  }]}>{r.check_no}</Text>
                <Text style={[s.cell, { width: 100 }]}>{r.loan_id_label}</Text>
                <Text style={[s.cell, { width: 180, color: Colors.textSecondary }]} numberOfLines={1}>{r.description}</Text>
                <Text style={[s.cell, { width: 100, textAlign: 'right', fontWeight: '600' }]}>{fmtN(r.amount)}</Text>
                {/* Edit button — purple like web */}
                <TouchableOpacity style={[s.cell, { width: 40, alignItems: 'center' }]}
                  onPress={() => onEdit(r.record_type, r.record_id)}>
                  <Text style={s.editLink}>edit</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}

          {/* Grand Total row */}
          <View style={[s.row, s.grandTotalRow]}>
            <View style={{ width: 34+40 }} />
            <Text style={[s.cell, s.grandTotalText, { width: 90+80+175+95+100+180 }]}>GRAND TOTAL</Text>
            <Text style={[s.cell, s.grandTotalText, { width: 100, textAlign: 'right' }]}>{fmtN(section.grand_total)}</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>
      </ScrollView>

      {/* Update Payment Month bar */}
      <View style={s.updateBar}>
        <Text style={s.updateBarLabel}>Payment Month</Text>
        <View style={{ flex: 1 }}>
          <DateInput value={updateDate} onChange={setUpdateDate} placeholder="Pick month" />
        </View>
        <TouchableOpacity style={[s.updateBarBtn, isPending && { opacity: 0.6 }]}
          onPress={handleUpdate} disabled={isPending}>
          <Text style={s.updateBarBtnText}>UPDATE PAYMENT MONTH FOR SELECTED</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────
export default function MonthlyRepaymentScreen() {
  const today    = new Date();
  const thisMMYYYY = `${String(today.getMonth()+1).padStart(2,'0')}-${today.getFullYear()}`;
  const [monthFrom, setMonthFrom] = useState(thisMMYYYY);
  const [monthTo,   setMonthTo]   = useState(thisMMYYYY);
  const [search,    setSearch]    = useState<any>(null);
  const { selectedBranch } = useBranchStore();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['monthly-repayment', search, selectedBranch?.id],
    queryFn: () => ReportService.monthlyRepayment({ month_from: search.from, month_to: search.to }),
    enabled: !!search,
  });

  const sections: any[] = data?.months ?? [];
  const branchName = data?.branch_name ?? selectedBranch?.name?.toUpperCase() ?? '';

  const handleEdit = (recordType: string, recordId: number) => {
    router.push(`/branch/reports/edit-repayment?type=${recordType}&id=${recordId}` as any);
  };

  return (
    <ScreenLayout title="Monthly-Wise Repayment" subtitle={selectedBranch?.name} showBack>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

        {/* Month range picker */}
        <View style={s.filterCard}>
          <Text style={s.filterLabel}>Month Range (MM-YYYY)</Text>
          <View style={s.filterRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.subLabel}>From</Text>
              <TextInput style={s.monthInput} value={monthFrom} onChangeText={setMonthFrom}
                placeholder="MM-YYYY" placeholderTextColor={Colors.textMuted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.subLabel}>To</Text>
              <TextInput style={s.monthInput} value={monthTo} onChangeText={setMonthTo}
                placeholder="MM-YYYY" placeholderTextColor={Colors.textMuted} />
            </View>
          </View>
          <TouchableOpacity style={s.searchBtn}
            onPress={() => setSearch({ from: monthFrom, to: monthTo })}>
            <Text style={s.searchBtnText}>🔍  View Report</Text>
          </TouchableOpacity>
        </View>

        {isLoading && <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />}

        {data && (
          <>
            <Text style={s.branchTitle}>{branchName} BRANCH</Text>
            {sections.length === 0 && (
              <View style={s.emptyBox}>
                <Text style={s.emptyText}>No repayments in this period.</Text>
              </View>
            )}
            {sections.map((section: any, i: number) => (
              <React.Fragment key={section.key ?? i}>
                {i > 0 && <View style={s.goldDivider} />}
                <MonthSection section={section} branchName={branchName} onEdit={handleEdit} />
              </React.Fragment>
            ))}
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  filterCard: { backgroundColor: Colors.surface, margin: Spacing.base, borderRadius: Radius.lg, padding: Spacing.base, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 },
  filterLabel:{ fontSize: 11, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  filterRow:  { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  subLabel:   { fontSize: 11, color: Colors.textMuted, marginBottom: 4 },
  monthInput: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: Colors.text },
  searchBtn:  { backgroundColor: NAVY, borderRadius: Radius.md, paddingVertical: 11, alignItems: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  branchTitle:{ textAlign: 'center', fontSize: 13, fontWeight: '800', color: NAVY, marginTop: Spacing.sm, marginBottom: Spacing.xs, textDecorationLine: 'underline', textTransform: 'uppercase' },
  goldDivider:{ height: 2, backgroundColor: '#c8a84b', marginHorizontal: Spacing.base, marginVertical: Spacing.md },

  section: { marginHorizontal: Spacing.base, marginBottom: Spacing.sm },
  monthTitle: { textAlign: 'center', fontSize: 13, fontWeight: '900', color: NAVY, textDecorationLine: 'underline', textTransform: 'uppercase', marginBottom: 8 },
  selRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: 8 },
  selectAllBtn: { backgroundColor: '#27ae60', borderRadius: 3, paddingHorizontal: 18, paddingVertical: 7 },
  selectAllText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  deselectBtn:  { backgroundColor: '#f5c6c6', borderRadius: 3, paddingHorizontal: 18, paddingVertical: 7 },
  deselectText: { color: '#800', fontWeight: '700', fontSize: 12 },

  table:  { borderRadius: Radius.sm, overflow: 'hidden', borderWidth: 1, borderColor: TEAL2 },
  row:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#e8e8e8' },
  rowAlt:      { backgroundColor: '#f5fffe' },
  rowSelected: { backgroundColor: '#e8f5e9' },
  thead:  { backgroundColor: TEAL, borderBottomWidth: 2, borderBottomColor: TEAL2 },
  cell:   { fontSize: 11, color: Colors.text, paddingHorizontal: 4 },
  th:     { color: '#1a1a1a', fontWeight: '700', fontSize: 11 },
  grandTotalRow: { backgroundColor: GOLD, borderTopWidth: 2, borderTopColor: GOLDB, borderBottomWidth: 0 },
  grandTotalText: { color: '#1a1a1a', fontWeight: '700', fontSize: 12 },

  checkbox: { width: 16, height: 16, borderRadius: 2, borderWidth: 2, borderColor: '#aaa', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: PURPLE, borderColor: PURPLE },
  checkmark: { color: '#fff', fontSize: 10, fontWeight: '700' },
  editLink:  { color: PURPLE, fontWeight: '700', fontSize: 11 },

  updateBar:      { marginTop: 8, padding: 12, backgroundColor: '#fdf6e3', borderWidth: 1, borderColor: '#e8d8a0', borderRadius: 3, gap: 8 },
  updateBarLabel: { fontSize: 12, fontWeight: '600', color: '#333' },
  updateBarInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 2, paddingHorizontal: 10, paddingVertical: 7, fontSize: 12, color: Colors.text, backgroundColor: '#fff' },
  updateBarBtn:   { backgroundColor: '#c8a84b', borderRadius: 3, paddingVertical: 10, alignItems: 'center' },
  updateBarBtnText: { color: '#fff', fontWeight: '700', fontSize: 11, letterSpacing: 0.4 },

  emptyBox:  { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
});
