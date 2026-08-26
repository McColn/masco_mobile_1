import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { formatTZS, getTodayLocal } from '@/lib/format';
import api from '@/lib/api';

// ── Reusable row components matching the screenshot ───────────────────────────
function Row({ label, amount, bold, indent }: {
  label: string; amount: number | null; bold?: boolean; indent?: boolean;
}) {
  const isZero = amount === 0;
  return (
    <View style={styles.row}>
      <Text style={[
        styles.rowLabel,
        bold && styles.rowLabelBold,
        indent && styles.rowLabelIndent,
      ]}>
        {label}
      </Text>
      <Text style={[
        styles.rowAmount,
        bold && styles.rowAmountBold,
        isZero && styles.rowAmountZero,
      ]}>
        {amount === null ? '' : formatTZS(amount)}
      </Text>
    </View>
  );
}

function SubtotalRow({ amount }: { amount: number }) {
  return (
    <View style={[styles.row, styles.subtotalRow]}>
      <Text style={styles.subtotalLabel}> </Text>
      <Text style={styles.subtotalAmount}>{formatTZS(amount)}</Text>
    </View>
  );
}

function SectionDivider() {
  return <View style={styles.divider} />;
}

export default function HQFinancialStatementScreen() {
  const today = getTodayLocal();
  const [dateFrom, setDateFrom] = useState(today.slice(0, 7) + '-01');
  const [dateTo,   setDateTo]   = useState(today);
  const [search,   setSearch]   = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['hq-financial-statement', search],
    queryFn: () => api.get('/reports/hq-financial/', {
      params: { date_from: search.from, date_to: search.to },
    }).then(r => r.data),
    enabled: !!search,
  });

  // Format date as DD/MM/YYYY matching web display
  const fmt = (d: string) => d?.split('-').reverse().join('/') ?? '';
  const dateLabel = data
    ? `${fmt(data.date_from)} TO ${fmt(data.date_to)}`
    : '';

  return (
    <ScreenLayout title="HQ Financial Statement" showBack>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <DateRangePicker
          dateFrom={dateFrom} dateTo={dateTo}
          onChangeDateFrom={setDateFrom} onChangeDateTo={setDateTo}
          onSearch={() => setSearch({ from: dateFrom, to: dateTo })}
          loading={isLoading}
        />

        {isLoading && (
          <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
        )}

        {data && (
          <View style={styles.reportContainer}>

            {/* ── Header — matches screenshot exactly ── */}
            <Text style={styles.reportBranch}>HQ BRANCH</Text>
            <Text style={styles.reportTitle}>
              FINANCIAL STATEMENT FROM {dateLabel}
            </Text>

            {/* ── Table ── */}
            <View style={styles.table}>

              {/* Column headers */}
              <View style={[styles.row, styles.headerRow]}>
                <Text style={[styles.rowLabel, styles.headerText]}>Particular</Text>
                <Text style={[styles.rowAmount, styles.headerText]}>Amount</Text>
              </View>

              {/* ── Opening Balance ── */}
              <Row label="Opening Balance" amount={data.opening_balance} bold />

              <SectionDivider />

              {/* ── Income rows ── */}
              <Row label="External Sources" amount={data.total_repayments} />
              <Row label="Hazina"           amount={data.total_hazina} />

              {/* Income subtotal — bold, underlined */}
              <SubtotalRow amount={data.income_subtotal} />

              <SectionDivider />

              {/* ── Outflow rows ── */}
              <Row label="Loans Disbursed (Fomu)" amount={data.total_loans_disbursed} />
              <Row label="Money to Branch"        amount={data.total_hq_transfers_out} />
              <Row label="Expenses"               amount={data.total_expenses} />
              <Row label="Bank Charges"           amount={data.total_bank_charges} />

              {/* Outflow subtotal — bold, underlined */}
              <SubtotalRow amount={data.outflow_subtotal} />

              <SectionDivider />

              {/* ── Closing Balance ── */}
              <Row label="Closing Balance" amount={data.closing_balance} bold />
            </View>
          </View>
        )}

        {!data && !isLoading && (
          <View style={styles.promptBox}>
            <Text style={styles.promptText}>Select a date range and tap Search</Text>
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  reportContainer: {
    margin: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Header titles
  reportBranch: {
    textAlign: 'center',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    textDecorationLine: 'underline',
    paddingTop: Spacing.base,
    letterSpacing: 0.5,
  },
  reportTitle: {
    textAlign: 'center',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    textDecorationLine: 'underline',
    paddingBottom: Spacing.base,
    paddingHorizontal: Spacing.base,
    letterSpacing: 0.3,
    marginTop: 4,
  },

  // Table
  table: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },

  // Column header row
  headerRow: {
    backgroundColor: Colors.surfaceAlt,
  },
  headerText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },

  // Standard row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLabel: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: Colors.text,
  },
  rowLabelBold: {
    fontWeight: Typography.weights.bold,
  },
  rowLabelIndent: {
    paddingLeft: Spacing.md,
  },
  rowAmount: {
    width: 150,
    textAlign: 'right',
    fontSize: Typography.sizes.sm,
    color: Colors.text,
  },
  rowAmountBold: {
    fontWeight: Typography.weights.bold,
  },
  rowAmountZero: {
    color: Colors.textMuted,
  },

  // Subtotal row — bold, underlined amount, no label
  subtotalRow: {
    backgroundColor: Colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  subtotalLabel: {
    flex: 1,
  },
  subtotalAmount: {
    width: 150,
    textAlign: 'right',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textDecorationLine: 'underline',
  },

  // Section divider — thick border between sections
  divider: {
    height: 2,
    backgroundColor: Colors.border,
  },

  promptBox: { padding: 40, alignItems: 'center' },
  promptText: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
});
