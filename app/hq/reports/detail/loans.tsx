// HQ Loans Report Detail — mirrors branches_loan_report() web view exactly
// Stats strip: Total Loans | Principal Issued | Total Interest |
//   Total Repayable (P+I) | Amount Collected | Outstanding | Collection Rate
// Table: S/N, Date, Name, Check No, Mobile No, Work Station, Loan ID,
//   Rate Type, Starting Month, Principal, Period, Rate %, Interest, Total, Monthly Inst.
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import api from '@/lib/api';
import { DateInput } from '@/components/ui/DateInput';

const TEAL = '#5bc0de'; const GOLD = '#c8a96e'; const NAVY = '#0d1b2e';
function fmtN(v: any) { return Math.round(Number(v)||0).toLocaleString('en-US'); }
function fmtDate(d: string) { return d?.split('-').reverse().join('/') ?? ''; }

export default function LoansReportDetail() {
  const { office, date } = useLocalSearchParams<{ office: string; date: string }>();
  const [dateFrom, setDateFrom] = useState(date ?? '');
  const [dateTo,   setDateTo]   = useState(date ?? '');
  const [search,   setSearch]   = useState({ from: date ?? '', to: date ?? '', office: office ?? '' });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['hq-loans-report', search],
    queryFn:  () => api.get('/hq/loans-report/', {
      params: { start_date: search.from, end_date: search.to, office: search.office },
      timeout: 30000, // this endpoint loops over every matching loan — give it room
    }).then(r => r.data),
    retry: 1,
  });

  // API returns both 'loans' (legacy) and 'loan_data' (new) — same array
  const loans: any[] = data?.loan_data ?? data?.loans ?? [];
  const summary       = data?.summary ?? null;

  return (
    <ScreenLayout title="Loans Processed" subtitle={office} showBack>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Filter bar */}
        <View style={s.filterBar}>
          <View style={s.filterRow}>
            <View style={{ flex: 1 }}><Text style={s.filterLabel}>From</Text><DateInput value={dateFrom} onChange={setDateFrom} /></View>
            <View style={{ flex: 1 }}><Text style={s.filterLabel}>To</Text><DateInput value={dateTo} onChange={setDateTo} /></View>
          </View>
          <TouchableOpacity style={s.applyBtn} onPress={() => setSearch({ from: dateFrom, to: dateTo, office: office ?? '' })}>
            <Text style={s.applyBtnText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>

        {/* Stats strip — matches screenshot's 7 metric cards */}
        {summary && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
            <View style={s.statsRow}>
              {[
                { label: 'Total Loans',          value: String(summary.total_loans), sub: '' },
                { label: 'Principal Issued',     value: fmtN(summary.total_loan_amount), sub: 'TZS' },
                { label: 'Total Interest',       value: fmtN(summary.total_interest), sub: 'TZS' },
                { label: 'Total Repayable (P+I)',value: fmtN(summary.total_repayable), sub: 'TZS' },
                { label: 'Amount Collected',     value: fmtN(summary.total_paid_amount), sub: 'TZS', color: Colors.success },
                { label: 'Outstanding',          value: fmtN(summary.total_outstanding), sub: 'TZS', color: Colors.error },
                { label: 'Collection Rate',      value: `${summary.collection_rate}%`, sub: '', color: TEAL },
              ].map((st, i) => (
                <View key={st.label} style={s.statCard}>
                  <Text style={s.statLabel}>{st.label}</Text>
                  <Text style={[s.statVal, st.color && { color: st.color }]}>{st.value}</Text>
                  {st.sub ? <Text style={s.statSub}>{st.sub}</Text> : null}
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {isLoading && <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />}

        {isError && !isLoading && (
          <View style={s.emptyBox}>
            <Text style={{ fontSize: 28 }}>⚠️</Text>
            <Text style={{ color: Colors.error, fontWeight: '600', marginTop: 8 }}>Failed to load loans</Text>
            <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 }}>
              {(error as any)?.response?.data?.detail
                ?? (error as any)?.response?.data?.error
                ?? (error as any)?.message
                ?? 'Network error — pull down to retry.'}
            </Text>
            {(error as any)?.response?.data?.trace && (
              <Text style={{ fontSize: 9, color: '#999', marginTop: 8, paddingHorizontal: 16 }} numberOfLines={8}>
                {(error as any).response.data.trace}
              </Text>
            )}
            <TouchableOpacity onPress={() => refetch()} style={[s.applyBtn, { marginTop: 12, paddingHorizontal: 24 }]}>
              <Text style={s.applyBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {loans.length > 0 && (
          <>
            <Text style={s.branchTitle}>{(search.office || 'ALL').toUpperCase()} BRANCH</Text>
            <Text style={s.reportTitle}>MONTHLY LOAN ISSUED FROM {fmtDate(search.from)} TO {fmtDate(search.to)}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginHorizontal: Spacing.base }}>
              <View style={s.table}>
                <View style={[s.row, s.thead]}>
                  {['S/N','Date','Name','Check No.','Mobile No.','Work Station','Loan ID','Rate Type','Starting Month','Principal (TZS)','Period','Rate %','Interest (TZS)','Total P+I (TZS)','Monthly Install. (TZS)'].map(h => (
                    <Text key={h} style={[s.cell, s.th,
                      h==='S/N'              ? {width:36,textAlign:'center'} :
                      h==='Date'             ? {width:85} :
                      h==='Name'             ? {width:160} :
                      h==='Check No.'        ? {width:90} :
                      h==='Mobile No.'       ? {width:105} :
                      h==='Work Station'     ? {width:100}:
                      h==='Loan ID'          ? {width:100} :
                      h==='Rate Type'        ? {width:55} :
                      h==='Starting Month'   ? {width:85} :
                      h==='Period'           ? {width:55,textAlign:'center'} :
                      h==='Rate %'           ? {width:60,textAlign:'center'} :
                      {width:115,textAlign:'right'}]}>{h}</Text>
                  ))}
                </View>
                {loans.map((l: any, i: number) => (
                  <View key={l.loan_id} style={[s.row, i%2===1 && s.rowAlt]}>
                    <Text style={[s.cell,{width:36,textAlign:'center',color:Colors.textMuted}]}>{l.sn}</Text>
                    <Text style={[s.cell,{width:85,color:Colors.textMuted}]}>{fmtDate(l.date)}</Text>
                    <Text style={[s.cell,{width:160,fontWeight:'600'}]} numberOfLines={1}>{l.client_name}</Text>
                    <Text style={[s.cell,{width:90}]}>{l.check_no}</Text>
                    <Text style={[s.cell,{width:105,color:Colors.textMuted}]}>{l.mobile}</Text>
                    <Text style={[s.cell,{width:100,color:Colors.textMuted}]} numberOfLines={1}>{l.work_station}</Text>
                    <Text style={[s.cell,{width:100,color:Colors.primary}]}>{l.loan_id_label}</Text>
                    <Text style={[s.cell,{width:55,textAlign:'center',color:Colors.textMuted}]}>{l.rate_type}</Text>
                    <Text style={[s.cell,{width:85}]}>{l.starting_month}</Text>
                    <Text style={[s.cell,{width:115,textAlign:'right',fontWeight:'600'}]}>{fmtN(l.loan_amount)}</Text>
                    <Text style={[s.cell,{width:55,textAlign:'center'}]}>{l.period}</Text>
                    <Text style={[s.cell,{width:60,textAlign:'center'}]}>{l.interest_rate}</Text>
                    <Text style={[s.cell,{width:115,textAlign:'right'}]}>{fmtN(l.total_interest)}</Text>
                    <Text style={[s.cell,{width:115,textAlign:'right'}]}>{fmtN(l.total_repayment_amount)}</Text>
                    <Text style={[s.cell,{width:115,textAlign:'right'}]}>{fmtN(l.monthly_installment)}</Text>
                  </View>
                ))}
                <View style={[s.row, s.tfoot]}>
                  <Text style={[s.cell, s.tfootText, {width:36+85+160+90+105+100+100+55+85}]}>GRAND TOTAL</Text>
                  <Text style={[s.cell, s.tfootText, {width:115,textAlign:'right'}]}>{fmtN(summary?.total_loan_amount)}</Text>
                  <Text style={[s.cell, {width:55+60}]}> </Text>
                  <Text style={[s.cell, s.tfootText, {width:115,textAlign:'right'}]}>{fmtN(summary?.total_interest)}</Text>
                  <Text style={[s.cell, s.tfootText, {width:115,textAlign:'right'}]}>{fmtN(summary?.total_repayable)}</Text>
                  <Text style={[s.cell, {width:115}]}> </Text>
                </View>
              </View>
            </ScrollView>
          </>
        )}
        {!isLoading && loans.length === 0 && data && (
          <View style={s.emptyBox}><Text style={s.emptyText}>No loans found for this period.</Text></View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  filterBar: { backgroundColor: Colors.surface, margin: Spacing.base, borderRadius: Radius.lg, padding: Spacing.base, elevation: 2, gap: Spacing.sm },
  filterRow: { flexDirection: 'row', gap: Spacing.sm },
  filterLabel:{ fontSize: 10, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 4 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 7, fontSize: 12, color: Colors.text },
  applyBtn: { backgroundColor: NAVY, borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  statsRow: { flexDirection: 'row', marginHorizontal: Spacing.base, gap: 8 },
  statCard: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingVertical: 10, paddingHorizontal: 12, minWidth: 110, alignItems: 'center', elevation: 1 },
  statLabel: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center', marginBottom: 4 },
  statVal:  { fontSize: 13, fontWeight: '700', color: Colors.text },
  statSub:  { fontSize: 8, color: Colors.textMuted, marginTop: 1 },
  branchTitle: { textAlign: 'center', fontSize: 12, fontWeight: '700', color: NAVY, textDecorationLine: 'underline', marginTop: Spacing.sm },
  reportTitle: { textAlign: 'center', fontSize: 11, fontWeight: '800', color: NAVY, textDecorationLine: 'underline', marginBottom: Spacing.sm },
  table: { borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  row:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 3, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowAlt:{ backgroundColor: '#f0f8fa' },
  thead: { backgroundColor: TEAL, borderBottomWidth: 2, borderBottomColor: '#4aa8c4' },
  tfoot: { backgroundColor: GOLD, borderBottomWidth: 0 },
  cell:  { fontSize: 10, color: Colors.text, paddingHorizontal: 3 },
  th:    { color: '#fff', fontWeight: '700', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.2 },
  tfootText: { color: '#1a1a1a', fontWeight: '800', fontSize: 10 },
  emptyBox:  { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
});
