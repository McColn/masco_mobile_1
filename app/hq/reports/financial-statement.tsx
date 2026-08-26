import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { formatTZS, getTodayLocal } from '@/lib/format';
import { ReportService } from '@/lib/services';

// Row definitions — order matches screenshot exactly
const ROWS: { key: string; label: string; bold?: boolean; subtotal?: boolean; separator?: boolean }[] = [
  { key: 'opening_balance',     label: 'Opening Balance',            bold: true },
  { key: 'mapato',              label: 'MAPATO' },
  { key: 'nyongeza',            label: 'NYONGEZA' },
  { key: 'hazina',              label: 'HAZINA' },
  { key: 'income_subtotal',     label: '',                           subtotal: true, separator: true },
  { key: 'fomu',                label: 'FOMU',                       bold: true },
  { key: 'matumizi_ofisini',    label: 'MATUMIZI OFISINI',           bold: true },
  { key: 'matumizi_kituo',      label: 'MATUMIZI BENKI-[KITUO]',     bold: true },
  { key: 'matumizi_mkurugenzi', label: 'MATUMIZI BENKI-[MKURUGENZI]',bold: true },
  { key: 'makato_benki',        label: 'MAKATO BANK',                bold: true },
  { key: 'outflow_subtotal',    label: '',                           subtotal: true, separator: true },
  { key: 'balance_cash',        label: 'BALANCE CASH',               bold: true },
  { key: 'balance_benki',       label: 'BALANCE BENKI',              bold: true },
  { key: 'balance_total',       label: 'Balance Total',              bold: true },
];

const COL_W_LABEL = 170;
const COL_W_DATA  = 115;
const NAVY        = '#0d1b2e';
const TEAL        = '#0da9a9';
const GOLD        = '#c9a84c';

function fmtVal(v: number): string {
  if (v === 0) return '0';
  // Format without TZS prefix, comma-separated like screenshot
  return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function HQBranchFinancialScreen() {
  const today = getTodayLocal();
  const [startDate, setStartDate] = useState(today.slice(0, 7) + '-01');
  const [endDate,   setEndDate]   = useState(today);
  const [search,    setSearch]    = useState<any>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['branch-financial', search],
    queryFn: async () => {
      const result = await ReportService.branchFinancial({ start_date: search.from, end_date: search.to });
      console.log('[FINANCIAL] API response keys:', Object.keys(result ?? {}));
      console.log('[FINANCIAL] offices:', result?.offices?.length, 'branches:', result?.branches?.length);
      return result;
    },
    enabled: !!search,
    retry: 1,
  });

  const offices: string[]   = data?.offices ?? [];
  const branches: any[]     = data?.branches ?? [];
  const totals: any          = data?.totals ?? {};

  const fmt = (d: string) => d?.split('-').reverse().join('/') ?? '';
  const dateLabel = data ? `${fmt(data.start_date)} TO ${fmt(data.end_date)}` : '';

  // Build a lookup: office_name -> row_key -> value
  const lookup: Record<string, Record<string, number>> = {};
  branches.forEach(b => { lookup[b.office] = b; });

  return (
    <ScreenLayout title="Financial Statement" subtitle="HQ" showBack>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <DateRangePicker
          dateFrom={startDate} dateTo={endDate}
          onChangeDateFrom={setStartDate} onChangeDateTo={setEndDate}
          onSearch={() => setSearch({ from: startDate, to: endDate })}
          loading={isLoading}
        />

        {isLoading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.loadingText}>Generating report...</Text>
            <Text style={styles.loadingHint}>
              This report queries all branches and may take up to 30 seconds.
            </Text>
          </View>
        )}

        {data && (
          <>
            {/* Title */}
            <Text style={styles.title}>
              FINANCIAL STATEMENT — {dateLabel}
            </Text>

            {/* Cross-tab: scroll both horizontally and vertically */}
            <ScrollView horizontal showsHorizontalScrollIndicator style={styles.tableWrapper}>
              <View>

                {/* ── Header row: PARTICULAR | branch1 | branch2 | ... | TOTAL ── */}
                <View style={styles.headerRow}>
                  <Text style={[styles.cell, styles.labelCell, styles.hText]}>PARTICULAR</Text>
                  {/* Branches sub-header */}
                  <View style={{ flexDirection: 'row' }}>
                    {offices.map(name => (
                      <Text key={name} style={[styles.cell, styles.dataCell, styles.hText, styles.center]}>
                        {name}
                      </Text>
                    ))}
                    <Text style={[styles.cell, styles.totalCell, styles.hText, styles.right]}>TOTAL</Text>
                  </View>
                </View>

                {/* ── Data rows ── */}
                {ROWS.map((row, ri) => {
                  if (row.subtotal) {
                    // Subtotal row — bold, underlined amounts, no label
                    return (
                      <View key={row.key} style={[styles.dataRow, styles.subtotalRow]}>
                        <Text style={[styles.cell, styles.labelCell]}> </Text>
                        {offices.map(name => {
                          const val = lookup[name]?.[row.key] ?? 0;
                          return (
                            <Text key={name} style={[styles.cell, styles.dataCell, styles.subtotalVal]}>
                              {fmtVal(val)}
                            </Text>
                          );
                        })}
                        <Text style={[styles.cell, styles.totalCell, styles.subtotalVal, styles.right]}>
                          {fmtVal(totals[row.key] ?? 0)}
                        </Text>
                      </View>
                    );
                  }

                  const isBalance = row.key.startsWith('balance_');
                  const bgStyle   = isBalance ? styles.balanceRow : (ri % 2 === 1 ? styles.rowAlt : null);

                  return (
                    <View key={row.key} style={[styles.dataRow, bgStyle]}>
                      <Text style={[styles.cell, styles.labelCell, row.bold && styles.boldText]}>
                        {row.label}
                      </Text>
                      {offices.map(name => {
                        const val = lookup[name]?.[row.key] ?? 0;
                        const isNeg = val < 0;
                        return (
                          <Text key={name} style={[
                            styles.cell, styles.dataCell, styles.right,
                            row.bold && styles.boldText,
                            isNeg && styles.negVal,
                            val === 0 && styles.zeroVal,
                          ]}>
                            {fmtVal(val)}
                          </Text>
                        );
                      })}
                      <Text style={[
                        styles.cell, styles.totalCell, styles.right,
                        styles.boldText,
                        (totals[row.key] ?? 0) < 0 && styles.negVal,
                      ]}>
                        {fmtVal(totals[row.key] ?? 0)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            {/* Legend */}
            <Text style={styles.legend}>
              Scroll horizontally to view all branches · Negative values shown in red
            </Text>
          </>
        )}

        {isError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Failed to load report</Text>
            <Text style={styles.errorMsg}>
              {(error as any)?.response?.data?.error
                ?? (error as any)?.response?.data?.detail
                ?? (error as any)?.message
                ?? 'Server error. Check dates and try again.'}
            </Text>
          </View>
        )}

        {!data && !isLoading && !isError && (
          <View style={styles.promptBox}>
            <Text style={styles.promptText}>Select a date range and tap Search</Text>
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  title: {
    textAlign: 'center',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    textDecorationLine: 'underline',
    marginVertical: Spacing.md,
    letterSpacing: 0.4,
  },
  tableWrapper: {
    marginHorizontal: Spacing.base,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Column widths
  labelCell: { width: COL_W_LABEL },
  dataCell:  { width: COL_W_DATA },
  totalCell: { width: COL_W_DATA + 10, backgroundColor: '#f0f7ff' },

  // Header
  headerRow: {
    flexDirection: 'row',
    backgroundColor: NAVY,
    borderBottomWidth: 2,
    borderBottomColor: TEAL,
  },
  hText: {
    color: '#fff',
    fontWeight: Typography.weights.bold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Data rows
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#fff',
  },
  rowAlt:     { backgroundColor: '#f9f9f9' },
  balanceRow: { backgroundColor: '#f0f7ff' },

  // Subtotal row
  subtotalRow: { backgroundColor: '#f5f5f5', borderTopWidth: 2, borderTopColor: Colors.border },
  subtotalVal: {
    fontWeight: Typography.weights.bold,
    textDecorationLine: 'underline',
    color: NAVY,
    textAlign: 'right',
    fontSize: 11,
  },

  // Cell base
  cell: {
    paddingHorizontal: 6,
    paddingVertical: 8,
    fontSize: 11,
    color: Colors.text,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  boldText: { fontWeight: Typography.weights.bold },
  center:   { textAlign: 'center' },
  right:    { textAlign: 'right' },
  negVal:   { color: Colors.error },
  zeroVal:  { color: Colors.textMuted },

  legend: {
    textAlign: 'center',
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    marginHorizontal: Spacing.base,
  },
  loadingBox: { alignItems: 'center', paddingTop: 40, gap: Spacing.sm, paddingHorizontal: Spacing.xl },
  loadingText: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold, color: Colors.text },
  loadingHint: { fontSize: Typography.sizes.xs, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
  errorBox: { margin: Spacing.base, backgroundColor: Colors.errorLight, borderRadius: Radius.lg, padding: Spacing.base, borderWidth: 1, borderColor: Colors.error + '40' },
  errorTitle: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.error, marginBottom: 4 },
  errorMsg: { fontSize: Typography.sizes.sm, color: Colors.error },
  promptBox:  { padding: 40, alignItems: 'center' },
  promptText: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
});
