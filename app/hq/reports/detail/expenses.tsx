// HQ Expenses Report Detail — mirrors expense_report() web view (screenshot 1)
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import api from '@/lib/api';
import { DateInput } from '@/components/ui/DateInput';

const NAVY = '#0d1b2e'; const GOLD = '#c8a96e';
function fmtN(v: any) { return Math.round(Number(v)||0).toLocaleString('en-US'); }
function fmtDate(d: string) { return d?.split('-').reverse().join('/') ?? ''; }

export default function ExpensesReportDetail() {
  const { office, date } = useLocalSearchParams<{ office: string; date: string }>();
  const [dateFrom, setDateFrom] = useState(date ?? '');
  const [dateTo,   setDateTo]   = useState(date ?? '');
  const [search,   setSearch]   = useState({ from: date ?? '', to: date ?? '', office: office ?? '' });

  const { data, isLoading } = useQuery({
    queryKey: ['hq-expense-report', search],
    queryFn:  () => api.get('/hq/expense-report/', {
      params: { start_date: search.from, end_date: search.to, office: search.office },
    }).then(r => r.data),
  });

  const rows: any[] = data?.rows ?? [];

  return (
    <ScreenLayout title="Expenses Statement" subtitle={office} showBack>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
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
            <Text style={s.reportTitle}>MONTHLY EXPENSES STATEMENT FROM {fmtDate(search.from)} TO {fmtDate(search.to)}</Text>

            {rows.length === 0 ? (
              <View style={s.emptyBox}><Text style={s.emptyText}>No expenses in this period.</Text></View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginHorizontal: Spacing.base }}>
                <View style={s.table}>
                  <View style={[s.row, s.thead]}>
                    {['Date','Receipt No.','Particular','Amount'].map(h => (
                      <Text key={h} style={[s.cell, s.th,
                        h==='Date'       ? {width:90} :
                        h==='Receipt No.'? {width:85} :
                        h==='Amount'     ? {width:110,textAlign:'right'} :
                        {width:280}]}>{h}</Text>
                    ))}
                  </View>
                  {rows.map((r: any, i: number) => (
                    <View key={r.id ?? i} style={[s.row, i%2===1 && s.rowAlt]}>
                      <Text style={[s.cell,{width:90,color:r.hide_date?'transparent':Colors.textSecondary}]}>
                        {r.hide_date ? '' : fmtDate(r.date)}
                      </Text>
                      <Text style={[s.cell,{width:85,color:Colors.primary}]}>{r.receipt_no}</Text>
                      <Text style={[s.cell,{width:280}]} numberOfLines={2}>
                        <Text style={{fontWeight:'700',color:'#4a235a'}}>{r.category}</Text>
                        {r.description ? ` [${r.description}]` : (!r.category && r.particular ? r.particular : '')}
                      </Text>
                      <Text style={[s.cell,{width:110,textAlign:'right',fontWeight:'700',color:Colors.error}]}>{fmtN(r.amount)}</Text>
                    </View>
                  ))}
                  <View style={[s.row, s.tfoot]}>
                    <Text style={[s.cell, s.tfootText, {width:90+85+280}]}>GRAND TOTAL</Text>
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
  table: { borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  row:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowAlt:{ backgroundColor: '#fff8f0' },
  thead: { backgroundColor: '#5bc0de', borderBottomWidth: 2, borderBottomColor: '#4aa8c4' },
  tfoot: { backgroundColor: GOLD, borderBottomWidth: 0 },
  cell:  { fontSize: 11, color: Colors.text, paddingHorizontal: 4 },
  th:    { color: '#fff', fontWeight: '700', fontSize: 10, textTransform: 'uppercase' },
  tfootText: { color: '#1a1a1a', fontWeight: '800', fontSize: 11 },
  emptyBox:  { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
});
