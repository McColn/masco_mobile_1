import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { formatTZS, getTodayLocal } from '@/lib/format';
import { ReportService } from '@/lib/services';

// Gold colour matching the web report footer
const GOLD = '#c9a84c';

export default function HQExpensesStatementScreen() {
  const today = getTodayLocal();
  const [dateFrom, setDateFrom] = useState(today.slice(0, 7) + '-01');
  const [dateTo,   setDateTo]   = useState(today);
  const [search,   setSearch]   = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['hq-expenses-statement', search],
    queryFn: () => ReportService.expenses({ date_from: search.from, date_to: search.to }),
    enabled: !!search,
  });

  const categories: any[] = data?.category_summary ?? [];
  const grandTotal         = data?.grand_total ?? 0;
  const dateLabel          = data
    ? `${data.date_from?.split('-').reverse().join('/')} TO ${data.date_to?.split('-').reverse().join('/')}`
    : '';

  return (
    <ScreenLayout title="Expenses Statement" subtitle="HQ" showBack>
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

            {/* Title — matches web heading style */}
            <Text style={styles.reportTitle}>
              EXPENSES STATEMENT REPORT
            </Text>
            <Text style={styles.reportSubtitle}>
              FROM {dateLabel}
            </Text>

            {/* Table */}
            <View style={styles.table}>

              {/* Header row */}
              <View style={[styles.row, styles.headerRow]}>
                <Text style={[styles.cell, styles.cellSN, styles.headerText]}>S/N</Text>
                <Text style={[styles.cell, styles.cellName, styles.headerText]}>Account Name</Text>
                <Text style={[styles.cell, styles.cellAmount, styles.headerText, styles.right]}>Amount</Text>
              </View>

              {/* Category rows */}
              {categories.length === 0 ? (
                <View style={styles.emptyRow}>
                  <Text style={styles.emptyText}>No expense categories found.</Text>
                </View>
              ) : (
                categories.map((cat: any, i: number) => (
                  <View key={cat.account_name} style={[
                    styles.row,
                    i % 2 === 0 ? styles.rowWhite : styles.rowGrey,
                  ]}>
                    <Text style={[styles.cell, styles.cellSN, styles.bodyText]}>{cat.sn}</Text>
                    <Text style={[styles.cell, styles.cellName, styles.bodyText]}>{cat.account_name}</Text>
                    <Text style={[styles.cell, styles.cellAmount, styles.bodyText, styles.right]}>
                      {/* Blank when no expense — matching web blank cell */}
                      {cat.has_expense ? formatTZS(cat.amount) : ''}
                    </Text>
                  </View>
                ))
              )}

              {/* Grand Total footer row — gold background matching web */}
              <View style={[styles.row, styles.footerRow]}>
                <Text style={[styles.cell, styles.cellSN, styles.footerText]}> </Text>
                <Text style={[styles.cell, styles.cellName, styles.footerText, styles.right]}>
                  GRAND TOTAL
                </Text>
                <Text style={[styles.cell, styles.cellAmount, styles.footerText, styles.right, styles.underline]}>
                  {formatTZS(grandTotal)}
                </Text>
              </View>

            </View>
          </View>
        )}

        {/* No data state before search */}
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

  // Title block
  reportTitle: {
    textAlign: 'center',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    textDecorationLine: 'underline',
    paddingTop: Spacing.base,
    paddingHorizontal: Spacing.base,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  reportSubtitle: {
    textAlign: 'center',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    textDecorationLine: 'underline',
    paddingBottom: Spacing.base,
    paddingHorizontal: Spacing.base,
    letterSpacing: 0.3,
  },

  // Table structure
  table: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    minHeight: 48,
  },
  rowWhite: { backgroundColor: '#fff' },
  rowGrey:  { backgroundColor: '#f8f8f8' },

  // Column widths
  cellSN: {
    width: 52,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  cellName: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    alignSelf: 'stretch',
  },
  cellAmount: {
    width: 130,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  // Text styles
  headerRow: { backgroundColor: Colors.surfaceAlt, minHeight: 44 },
  headerText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  bodyText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
  },

  // Gold footer — matches web exactly
  footerRow: {
    backgroundColor: GOLD,
    borderBottomWidth: 0,
    minHeight: 48,
  },
  footerText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: '#fff',
  },
  underline: {
    textDecorationLine: 'underline',
  },

  right: { textAlign: 'right' },

  // Empty / prompt states
  emptyRow: { padding: 30, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
  promptBox: { padding: 40, alignItems: 'center' },
  promptText: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
});
