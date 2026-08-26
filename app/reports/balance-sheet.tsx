// Balance Sheet — mirrors balance_sheet_report() web view exactly.
// Accessible from both HQ and branch menus; scoping (single branch vs
// all branches) is handled entirely server-side via the X-Office-Id header,
// same as every other report screen in this app.
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, TextInput,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { DateInput } from '@/components/ui/DateInput';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { useBranchStore } from '@/store/branchStore';
import { ReportService } from '@/lib/services';
import { getTodayLocal } from '@/lib/format';

const GREEN = '#16a34a';
const GREEN_DARK = '#15803d';
const BLUE  = '#1d4ed8';
const NAVY  = '#0d4a7a';
const PURPLE = '#8b5cf6';

function fmtN(v: any): string {
  const n = Number(v) || 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Row({ label, value, bold }: { label: string; value: any; bold?: boolean }) {
  return (
    <View style={[s.row, bold && s.rowBold]}>
      <Text style={[s.rowLabel, bold && s.rowLabelBold]}>{label}</Text>
      <Text style={[s.rowValue, bold && s.rowValueBold]}>{fmtN(value)}</Text>
    </View>
  );
}

export default function BalanceSheetScreen() {
  const today = getTodayLocal();
  const [asOfDate, setAsOfDate] = useState(today);
  const [search,   setSearch]   = useState<string | null>(null);
  const { selectedBranch } = useBranchStore();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['balance-sheet', search, selectedBranch?.id],
    queryFn: () => ReportService.balanceSheet({ as_of_date: search! }),
    enabled: !!search,
    retry: 1,
  });

  return (
    <ScreenLayout title="Balance Sheet" subtitle={selectedBranch?.name} showBack>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

        {/* Single date picker */}
        <View style={s.filterCard}>
          <Text style={s.filterLabel}>As of Date</Text>
          <DateInput
            value={asOfDate}
            onChange={setAsOfDate}
            placeholder="Pick a date"
          />
          <TouchableOpacity style={s.searchBtn} onPress={() => setSearch(asOfDate)}>
            <Text style={s.searchBtnText}>⚖️  Generate Balance Sheet</Text>
          </TouchableOpacity>
        </View>

        {isLoading && <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />}

        {isError && !isLoading && (
          <View style={s.emptyBox}>
            <Text style={{ fontSize: 28 }}>⚠️</Text>
            <Text style={{ color: Colors.error, fontWeight: '600', marginTop: 8 }}>Failed to load</Text>
            <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 }}>
              {(error as any)?.response?.data?.detail ?? (error as any)?.message ?? 'Network error'}
            </Text>
          </View>
        )}

        {data && (
          <>
            <Text style={s.heading}>Balance Sheet</Text>
            <Text style={s.asOf}>As of {data.as_of_date_display}</Text>
            <Text style={s.generated}>
              Generated: {new Date(data.generated_at).toLocaleString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })} — {data.branch_name}
            </Text>

            {/* ASSETS card */}
            <View style={[s.section, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
              <Text style={[s.sectionTitle, { color: GREEN_DARK }]}>💰 ASSETS</Text>

              <Text style={s.subHeading}>💲 Current Assets</Text>
              <Row label="Cash" value={data.cash_in_office} />
              <Row label="Bank" value={data.cash_in_bank} />
              <Row label="Receivables" value={data.receivables} />
              <View style={[s.subtotalRow, { backgroundColor: '#dcfce7' }]}>
                <Text style={[s.subtotalLabel, { color: GREEN_DARK }]}>Total Current Assets</Text>
                <Text style={[s.subtotalValue, { color: GREEN_DARK }]}>{fmtN(data.total_current_assets)}</Text>
              </View>

              <Text style={s.subHeading}>🏢 Fixed Assets</Text>
              <Text style={s.emptyState}>No fixed assets found</Text>

              <View style={[s.totalBanner, { backgroundColor: GREEN }]}>
                <Text style={s.totalBannerLabel}>TOTAL ASSETS</Text>
                <Text style={s.totalBannerValue}>{fmtN(data.total_assets)}</Text>
              </View>
            </View>

            {/* LIABILITIES & EQUITY card */}
            <View style={[s.section, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
              <Text style={[s.sectionTitle, { color: BLUE }]}>📊 LIABILITIES & EQUITY</Text>

              <Text style={s.subHeading}>👤 Equity</Text>
              <Row label="Owner Capital" value={data.owner_capital} />
              <Row label="Opening Balance Equity" value={data.opening_balance_equity} />
              <Row label="Retained Earnings" value={data.retained_earnings} />
              <View style={[s.subtotalRow, { backgroundColor: '#dbeafe' }]}>
                <Text style={[s.subtotalLabel, { color: BLUE }]}>Total Equity</Text>
                <Text style={[s.subtotalValue, { color: BLUE }]}>{fmtN(data.total_equity)}</Text>
              </View>
            </View>

            {/* Grand total */}
            <View style={[s.grandTotal, { backgroundColor: NAVY }]}>
              <Text style={s.grandTotalLabel}>TOTAL LIABILITIES + EQUITY</Text>
              <Text style={s.grandTotalValue}>{fmtN(data.total_liabilities_equity)}</Text>
            </View>

            {!data.is_balanced && (
              <View style={s.warningBanner}>
                <Text style={s.warningText}>⚠️ Balance Sheet is not balanced — please review.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  filterCard: {
    backgroundColor: Colors.surface, margin: Spacing.base,
    borderRadius: Radius.lg, padding: Spacing.base, ...Shadow.sm, gap: Spacing.sm,
  },
  filterLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.text,
  },
  searchBtn: { backgroundColor: PURPLE, borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  heading: { textAlign: 'center', fontSize: 22, fontWeight: '800', color: Colors.text, marginTop: Spacing.md },
  asOf: { textAlign: 'center', fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  generated: { textAlign: 'center', fontSize: 11, color: Colors.textMuted, marginTop: 4, marginBottom: Spacing.md },

  section: { marginHorizontal: Spacing.base, marginBottom: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.base },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1.5, borderBottomColor: 'rgba(0,0,0,0.06)' },
  subHeading: { fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 6, marginBottom: 8 },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 6 },
  rowBold: {},
  rowLabel: { fontSize: 13, color: '#334155' },
  rowLabelBold: { fontWeight: '700' },
  rowValue: { fontSize: 13, fontWeight: '600', color: '#0f172a', fontFamily: 'monospace' },
  rowValueBold: { fontWeight: '800' },

  subtotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, marginTop: 6 },
  subtotalLabel: { fontSize: 13, fontWeight: '700' },
  subtotalValue: { fontSize: 13, fontWeight: '700', fontFamily: 'monospace' },

  emptyState: { textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: 12, paddingVertical: 10 },

  totalBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: Radius.md, paddingHorizontal: 16, paddingVertical: 14, marginTop: 14 },
  totalBannerLabel: { color: '#fff', fontWeight: '700', fontSize: 14 },
  totalBannerValue: { color: '#fff', fontWeight: '700', fontSize: 17, fontFamily: 'monospace' },

  grandTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: Spacing.base, borderRadius: Radius.lg, paddingHorizontal: 20, paddingVertical: 18, marginBottom: Spacing.md },
  grandTotalLabel: { color: '#fff', fontWeight: '800', fontSize: 15 },
  grandTotalValue: { color: '#fff', fontWeight: '800', fontSize: 19, fontFamily: 'monospace' },

  warningBanner: { backgroundColor: '#fee2e2', borderRadius: Radius.md, marginHorizontal: Spacing.base, padding: 12, alignItems: 'center' },
  warningText: { color: '#b91c1c', fontWeight: '600', fontSize: 12 },

  emptyBox: { padding: 40, alignItems: 'center' },
});
