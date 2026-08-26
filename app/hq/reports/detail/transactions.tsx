// HQ Bank Transfer Expenses — mirrors bank_transfer_expenses2() web view (screenshot 3)
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import api from '@/lib/api';
import { DateInput } from '@/components/ui/DateInput';

const NAVY = '#0d1b2e'; const GOLD = '#c8a96e'; const TEAL = '#5bc0de';
function fmtN(v: any) { return Math.round(Number(v)||0).toLocaleString('en-US'); }
function fmtDate(d: string) { return d?.split('-').reverse().join('/') ?? ''; }

export default function TransactionsReportDetail() {
  const { office, date } = useLocalSearchParams<{ office: string; date: string }>();
  const [dateFrom, setDateFrom] = useState(date ?? '');
  const [dateTo,   setDateTo]   = useState(date ?? '');
  const [search,   setSearch]   = useState({ from: date ?? '', to: date ?? '', office: office ?? '' });

  const { data, isLoading } = useQuery({
    queryKey: ['hq-bank-transfer', search],
    queryFn:  () => api.get('/hq/bank-transfer/', {
      params: { start_date: search.from, end_date: search.to, office: search.office },
    }).then(r => r.data),
  });

  const rows: any[] = data?.rows ?? [];

  return (
    <ScreenLayout title="Bank Transfer Expenses" subtitle={office} showBack>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={s.filterBar}>
          <View style={s.filterRow}>
            <View style={{ flex: 1 }}><Text style={s.filterLabel}>From</Text><DateInput value={dateFrom} onChange={setDateFrom} /></View>
            <View style={{ flex: 1 }}><Text style={s.filterLabel}>To</Text><DateInput value={dateTo} onChange={setDateTo} /></View>
          </View>
          <TouchableOpacity style={s.applyBtn} onPress={() => setSearch({ from: dateFrom, to: dateTo, office: office ?? '' })}>
            <Text style={s.applyBtnText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>

        {isLoading && <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />}

        {data && (
          <>
            <Text style={s.branchTitle}>{(search.office || 'ALL').toUpperCase()} BRANCH</Text>
            <Text style={s.reportTitle}>BANK TRANSFER EXPENSES FROM {search.from} TO {search.to}</Text>

            {/* Stats strip — matches screenshot's 5 metric cards */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
              <View style={s.statsRow}>
                {[
                  { label: 'Total Records',  value: String(data.total_records), sub: 'bank transfer entries' },
                  { label: 'Payment Method', value: 'Bank Transfer',            sub: 'all filtered records', color: TEAL },
                  { label: 'Grand Total',    value: fmtN(data.grand_total),     sub: 'TZS', color: Colors.error },
                  { label: 'Office',         value: (search.office || 'ALL').toUpperCase(), sub: 'branch filter' },
                  { label: 'Period',         value: search.from,                sub: `to ${search.to}` },
                ].map((st) => (
                  <View key={st.label} style={s.statCard}>
                    <Text style={s.statLabel}>{st.label}</Text>
                    <Text style={[s.statVal, st.color && { color: st.color }]} numberOfLines={1}>{st.value}</Text>
                    {st.sub ? <Text style={s.statSub} numberOfLines={1}>{st.sub}</Text> : null}
                  </View>
                ))}
              </View>
            </ScrollView>

            {rows.length === 0 ? (
              <View style={{ marginHorizontal: Spacing.base }}>
                <View style={s.table}>
                  <View style={[s.row, s.thead]}>
                    {['#','Date','Receipt No.','Description','From Branch','To Branch','Processed By','Amount (TZS)'].map(h => (
                      <Text key={h} style={[s.cell, s.th,
                        h==='#'          ? {width:36,textAlign:'center'} :
                        h==='Date'       ? {width:90} :
                        h==='Receipt No.'? {width:90} :
                        h==='Description'? {width:220}:
                        h==='From Branch'? {width:90} :
                        h==='To Branch'  ? {width:90} :
                        h==='Processed By'?{width:130}:
                        {width:110,textAlign:'right'}]}>{h}</Text>
                    ))}
                  </View>
                  {/* Empty state still shows GRAND TOTAL row with 0, matching screenshot */}
                  <View style={[s.row, s.tfoot]}>
                    <Text style={[s.cell, s.tfootText, {width:36+90+90+220+90+90+130}]}>GRAND TOTAL</Text>
                    <Text style={[s.cell, s.tfootText, {width:110,textAlign:'right',textDecorationLine:'underline'}]}>0</Text>
                  </View>
                </View>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginHorizontal: Spacing.base }}>
                <View style={s.table}>
                  <View style={[s.row, s.thead]}>
                    {['#','Date','Receipt No.','Description','From Branch','To Branch','Processed By','Amount (TZS)'].map(h => (
                      <Text key={h} style={[s.cell, s.th,
                        h==='#'          ? {width:36,textAlign:'center'} :
                        h==='Date'       ? {width:90} :
                        h==='Receipt No.'? {width:90} :
                        h==='Description'? {width:220}:
                        h==='From Branch'? {width:90} :
                        h==='To Branch'  ? {width:90} :
                        h==='Processed By'?{width:130}:
                        {width:110,textAlign:'right'}]}>{h}</Text>
                    ))}
                  </View>
                  {rows.map((r: any, i: number) => (
                    <View key={r.sn} style={[s.row, i%2===1 && s.rowAlt]}>
                      <Text style={[s.cell,{width:36,textAlign:'center',color:Colors.textMuted}]}>{r.sn}</Text>
                      <Text style={[s.cell,{width:90,color:Colors.textMuted}]}>{fmtDate(r.date)}</Text>
                      <Text style={[s.cell,{width:90,color:Colors.primary}]}>{r.receipt_no}</Text>
                      <Text style={[s.cell,{width:220,color:Colors.textSecondary}]} numberOfLines={2}>{r.description}</Text>
                      <Text style={[s.cell,{width:90,fontWeight:'500'}]}>{r.from_branch}</Text>
                      <Text style={[s.cell,{width:90,fontWeight:'500'}]}>{r.to_branch}</Text>
                      <Text style={[s.cell,{width:130,color:Colors.textMuted}]} numberOfLines={1}>{r.processed_by}</Text>
                      <Text style={[s.cell,{width:110,textAlign:'right',fontWeight:'700'}]}>{fmtN(r.amount)}</Text>
                    </View>
                  ))}
                  <View style={[s.row, s.tfoot]}>
                    <Text style={[s.cell, s.tfootText, {width:36+90+90+220+90+90+130}]}>GRAND TOTAL</Text>
                    <Text style={[s.cell, s.tfootText, {width:110,textAlign:'right',textDecorationLine:'underline'}]}>{fmtN(data.grand_total)}</Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </>
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
  branchTitle: { textAlign: 'center', fontSize: 12, fontWeight: '700', color: NAVY, textDecorationLine: 'underline', marginTop: Spacing.sm },
  reportTitle: { textAlign: 'center', fontSize: 11, fontWeight: '800', color: NAVY, textDecorationLine: 'underline', marginBottom: Spacing.sm },
  statsRow: { flexDirection: 'row', marginHorizontal: Spacing.base, gap: 8 },
  statCard: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, paddingVertical: 10, paddingHorizontal: 12, minWidth: 110, alignItems: 'center', elevation: 1 },
  statLabel: { fontSize: 9, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center', marginBottom: 4 },
  statVal:  { fontSize: 13, fontWeight: '700', color: Colors.text },
  statSub:  { fontSize: 8, color: Colors.textMuted, marginTop: 1 },
  table: { borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  row:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 3, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowAlt:{ backgroundColor: '#f8f9fa' },
  thead: { backgroundColor: TEAL, borderBottomWidth: 2, borderBottomColor: '#4aa8c4' },
  tfoot: { backgroundColor: GOLD, borderBottomWidth: 0 },
  cell:  { fontSize: 10, color: Colors.text, paddingHorizontal: 3 },
  th:    { color: '#fff', fontWeight: '700', fontSize: 9, textTransform: 'uppercase' },
  tfootText: { color: '#1a1a1a', fontWeight: '800', fontSize: 10 },
  emptyBox:  { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
});
