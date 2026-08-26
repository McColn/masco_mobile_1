// Branch Financial Statement — mirrors financial_statement_report() web view exactly
// Layout matches screenshot: two-column table (Particular | Amount TZS)
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { useBranchStore } from '@/store/branchStore';
import { ReportService } from '@/lib/services';
import { getTodayLocal } from '@/lib/format';

const NAVY    = '#0d1b2e';
const TEAL_BG = '#e8f4f8';
const TEAL_BORDER = '#7fc8d9';
const SUBTOTAL_BG = '#fafafa';

function fmtN(v: any): string {
  if (v === null || v === undefined) return '—';
  const n = Number(v);
  if (isNaN(n)) return '—';
  return Math.round(n).toLocaleString('en-US');
}

function fmt(d: string) { return d?.split('-').reverse().join('/') ?? ''; }

// ── Row components ────────────────────────────────────────────────────────
function Row({ label, value, style, labelStyle, valueStyle, indent = false }: any) {
  return (
    <View style={[s.row, style]}>
      <Text style={[s.label, indent && { paddingLeft: 16 }, labelStyle]}>{label}</Text>
      <Text style={[s.amount, valueStyle]}>{value === null || value === undefined ? '—' : fmtN(value)}</Text>
    </View>
  );
}

function SepRow() {
  return <View style={s.sepRow} />;
}

function SubtotalRow({ value }: { value: any }) {
  return (
    <View style={s.subtotalRow}>
      <Text style={s.subtotalLabel}> </Text>
      <Text style={s.subtotalAmount}>{fmtN(value)}</Text>
    </View>
  );
}

export default function FinancialStatementScreen() {
  const today = getTodayLocal();
  const [dateFrom, setDateFrom] = useState(today.slice(0, 7) + '-01');
  const [dateTo,   setDateTo]   = useState(today);
  const [search,   setSearch]   = useState<any>(null);
  const { selectedBranch } = useBranchStore();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['financial-statement', search, selectedBranch?.id],
    queryFn: () => ReportService.financialStatement({ date_from: search.from, date_to: search.to }),
    enabled: !!search,
  });

  const branchName = data?.branch_name ?? selectedBranch?.name?.toUpperCase() ?? '';
  const matumizi: any[] = data?.matumizi_ofisini_rows ?? [];

  return (
    <ScreenLayout title="Financial Statement" subtitle={selectedBranch?.name} showBack>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <DateRangePicker
          dateFrom={dateFrom} dateTo={dateTo}
          onChangeDateFrom={setDateFrom} onChangeDateTo={setDateTo}
          onSearch={() => setSearch({ from: dateFrom, to: dateTo })}
          loading={isLoading}
        />

        {isLoading && <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />}

        {data && (
          <View style={s.card}>
            {/* ── Letterhead ─────────────────────────────────── */}
            <View style={s.letterhead}>
              <Text style={s.companyName}>MASCO FINANCE CO. LTD</Text>
              <Text style={s.companyAddr}>P.O.BOX 30474—KIBAHA | TANZANIA</Text>
              <Text style={s.companyContact}>Mobile: +255 718 544 515  |  mascofinance@gmail.com</Text>
            </View>

            {/* ── Title ──────────────────────────────────────── */}
            <Text style={s.branchTitle}>{branchName} BRANCH</Text>
            <Text style={s.reportTitle}>
              Financial Statement — {fmt(data.date_from)} to {fmt(data.date_to)}
            </Text>

            {/* ── Table ──────────────────────────────────────── */}
            <View style={s.table}>
              {/* Header */}
              <View style={s.thead}>
                <Text style={s.theadLabel}>Particular</Text>
                <Text style={[s.theadAmount]}>Amount (TZS)</Text>
              </View>

              {/* Opening Balance */}
              <Row label="Opening Balance" value={data.opening_stock} labelStyle={{ fontWeight: '700' }} valueStyle={{ fontWeight: '700' }} />

              <SepRow />

              {/* ── INCOME ─────────────────────────────────── */}
              <Row label="MAPATO"  value={data.total_mapato} />
              <Row label="NYONGEZA" value={data.total_transfers_in} style={{ backgroundColor: '#f0fff4' }} valueStyle={{ color: Colors.success }} />
              <Row label="HAZINA"  value={data.total_hazina} />
              <SubtotalRow value={data.total_income_with_opening} />

              <SepRow />

              {/* ── EXPENDITURE ─────────────────────────────── */}
              <Row label="FOMU" value={data.total_loans_disbursed}
                style={{ backgroundColor: '#fff8f0' }}
                labelStyle={{ fontWeight: '700' }} valueStyle={{ fontWeight: '700' }} />

              <SepRow />

              {/* MATUMIZI OFISINI — single row (web shows total only) */}
              <Row label="MATUMIZI OFISINI" value={data.total_matumizi_ofisini} />

              <SepRow />

              <Row label="MATUMIZI BENKI-[KITUO]" value={data.transfers_kituo} />

              <SepRow />

              <Row label="MATUMIZI BENKI-[MKURUGENZI]" value={data.total_matumizi_mkurugenzi} />

              <SepRow />

              <Row label="MAKATO BANK" value={data.total_makato_benki}
                labelStyle={{ fontWeight: '700' }} valueStyle={{ fontWeight: '700' }} />

              <SepRow />

              <SubtotalRow value={data.total_outflow} />

              <SepRow />

              {/* ── CLOSING BALANCE ─────────────────────────── */}
              <Row label="BALANCE CASH"  value={data.cash_in_office} />
              <Row label="BALANCE BENKI" value={data.cash_in_bank} />
              <SubtotalRow value={data.total_cash} />
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  card: {
    margin: Spacing.base,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  // Letterhead
  letterhead: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#8b0000',
  },
  companyName:    { fontSize: 16, fontWeight: '900', color: '#2471a3', textTransform: 'uppercase', letterSpacing: 0.5 },
  companyAddr:    { fontSize: 11, color: '#1a1a1a', marginTop: 2 },
  companyContact: { fontSize: 10, color: '#1a1a1a', marginTop: 2 },

  // Titles
  branchTitle: {
    textAlign: 'center', fontSize: 13, fontWeight: '700',
    color: '#1a1a1a', textDecorationLine: 'underline',
    marginTop: 14, textTransform: 'uppercase',
  },
  reportTitle: {
    textAlign: 'center', fontSize: 12, fontWeight: '900',
    color: '#1a1a1a', textDecorationLine: 'underline',
    marginBottom: 14, textTransform: 'uppercase',
  },

  // Table
  table: { borderTopWidth: 1, borderTopColor: '#ccc' },
  thead: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 9, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: '#bbb',
  },
  theadLabel:  { flex: 1, fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  theadAmount: { width: 130, textAlign: 'right', fontSize: 13, fontWeight: '700', color: '#1a1a1a' },

  // Normal row
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 9, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: '#ddd',
  },
  label:  { flex: 1, fontSize: 13, color: '#1a1a1a' },
  amount: { width: 130, textAlign: 'right', fontSize: 13, color: '#1a1a1a', whiteSpace: 'nowrap' as any },

  // Subtotal row — double-underline style
  subtotalRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 9, paddingHorizontal: 14,
    backgroundColor: SUBTOTAL_BG,
    borderTopWidth: 2, borderTopColor: '#999',
    borderBottomWidth: 2, borderBottomColor: '#999',
  },
  subtotalLabel:  { flex: 1 },
  subtotalAmount: {
    width: 130, textAlign: 'right',
    fontSize: 13, fontWeight: '700', color: '#1a1a1a',
    textDecorationLine: 'underline',
  },

  // Separator row
  sepRow: { height: 6, backgroundColor: '#f7f7f7', borderBottomWidth: 1, borderBottomColor: '#eee' },
});
