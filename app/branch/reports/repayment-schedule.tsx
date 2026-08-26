// Repayment Schedule (Monthly Outstanding) — mirrors monthly_outstanding_report() web view
// New web logic:
//   - due_cutoff = min(selected_date, today) — the SELECTED DAY matters
//   - Slot amounts computed via ROUND_CEILING to nearest 1000 TZS
//   - Deadlines are the 18th of each month starting from first_repayment_date
//   - FIFO allocation of payments across slots
//   - Excludes loan_type='Hazina'
//   - Outstanding total = REAL live balance from ALL payments to date
// Columns: S/N | Name | Check no | Employer | Contact |
//   Amount to be paid | Paid amount (This month) | Not paid | Outstanding (Total)
// Sorted alphabetically by client name (matches web view)
// Filter: single date input (any day within the target month), matching the web's
// <input type="date" name="selected_month"> — server uses the actual selected day
import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { useBranchStore } from '@/store/branchStore';
import { ReportService } from '@/lib/services';
import { useDebounce } from '@/hooks/useDebounce';
import { getTodayLocal } from '@/lib/format';
import { DateInput } from '@/components/ui/DateInput';

const TEAL = '#5bc0de';
const GOLD = '#c8a96e';
const NAVY = '#0d1b2e';
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtN(v: any): string {
  const n = Number(v) || 0;
  if (n === 0) return '0';
  return Math.round(n).toLocaleString('en-US');
}

// Validate YYYY-MM-DD and return {y, m, d} — the day now matters for the
// new web logic (due_cutoff = min(selected_date, today))
function parseSelectedDate(s: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

export default function RepaymentScheduleScreen() {
  const [selectedDate, setSelectedDate] = useState(getTodayLocal());
  const [dateQuery, setDateQuery] = useState<string | null>(null);
  const [nameSearch, setNameSearch] = useState('');
  const debouncedSearch = useDebounce(nameSearch, 250);
  const { selectedBranch } = useBranchStore();

  const parsed = parseSelectedDate(selectedDate);

  const { data, isLoading } = useQuery({
    queryKey: ['repayment-schedule', dateQuery, selectedBranch?.id],
    queryFn: () => ReportService.monthlyOutstanding({ month: dateQuery! }),
    enabled: !!dateQuery,
  });

  const allRows: any[] = data?.loans ?? data?.rows ?? [];

  // Client-side name/check-no/contact search — list can be long, this keeps
  // it instant without re-hitting the server for every keystroke
  const rows: any[] = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((r: any) =>
      String(r.name ?? '').toLowerCase().includes(q) ||
      String(r.check_no ?? '').toLowerCase().includes(q) ||
      String(r.contact ?? '').toLowerCase().includes(q) ||
      String(r.employer ?? '').toLowerCase().includes(q)
    );
  }, [allRows, debouncedSearch]);

  // Totals recompute against the filtered set so the footer reflects what's
  // actually visible, matching the visible rows rather than the unfiltered month
  const filteredTotals = useMemo(() => {
    const sum = (key: string) => rows.reduce((a: number, r: any) => a + (Number(r[key]) || 0), 0);
    return {
      amount_to_be_paid: sum('amount_to_be_paid'),
      paid_this_month:   sum('paid_this_month'),
      not_paid:          sum('not_paid'),
      outstanding_total: sum('outstanding_total'),
    };
  }, [rows]);

  const branchName = data?.branch_name ?? selectedBranch?.name?.toUpperCase() ?? '';
  const monthLabel = data?.month_label ??
    (parsed ? `${MONTHS[parsed.m-1].toUpperCase()}/${parsed.y}` : '');

  return (
    <ScreenLayout title="Repayment Schedule" subtitle={selectedBranch?.name} showBack>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">

        {/* Single date picker — matches web's <input type="date" name="selected_month"> */}
        <View style={s.filterCard}>
          <Text style={s.filterLabel}>Selected Month (pick any day within the target month)</Text>
          <DateInput value={selectedDate} onChange={setSelectedDate} style={s.dateInput} />
          {parsed && (
            <Text style={s.datePreview}>
              → Report as of <Text style={{ fontWeight: '700', color: NAVY }}>
                {String(parsed.d).padStart(2,'0')}/{String(parsed.m).padStart(2,'0')}/{parsed.y}
              </Text>{'  '}(payments made up to this date only)
            </Text>
          )}

          <TouchableOpacity
            style={[s.searchBtn, !parsed && { opacity: 0.5 }]}
            disabled={!parsed}
            onPress={() => parsed && setDateQuery(selectedDate)}>
            <Text style={s.searchBtnText}>🔍  View Schedule</Text>
          </TouchableOpacity>
        </View>

        {/* Name search — only shown once a month has been loaded */}
        {data && (
          <View style={s.nameSearchBox}>
            <Text style={s.nameSearchIcon}>🔍</Text>
            <TextInput
              style={s.nameSearchInput}
              value={nameSearch}
              onChangeText={setNameSearch}
              placeholder="Search by name, check no, contact, or employer..."
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
            />
            {nameSearch.length > 0 && (
              <TouchableOpacity onPress={() => setNameSearch('')}>
                <Text style={s.nameSearchClear}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isLoading && <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />}

        {data && (
          <>
            {/* Title — matches screenshot */}
            <Text style={s.branchTitle}>{branchName} BRANCH</Text>
            <Text style={s.reportTitle}>MONTHLY OUTSTANDING UP TO {monthLabel}</Text>

            {/* Results counter — shows filtered vs total when searching */}
            <Text style={s.resultsCount}>
              {nameSearch.trim()
                ? `${rows.length} of ${allRows.length} client${allRows.length !== 1 ? 's' : ''} match`
                : `${allRows.length} client${allRows.length !== 1 ? 's' : ''} outstanding`}
            </Text>

            {rows.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyText}>
                  {nameSearch.trim()
                    ? `No clients matching "${nameSearch.trim()}".`
                    : 'No outstanding clients for this month.'}
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginHorizontal: Spacing.base }}>
                <View style={s.table}>

                  {/* ── Column headers ── */}
                  <View style={[s.row, s.thead]}>
                    <Text style={[s.cell, s.th, { width: 40,  textAlign: 'center' }]}>S/N</Text>
                    <Text style={[s.cell, s.th, { width: 165 }]}>Name</Text>
                    <Text style={[s.cell, s.th, { width: 90  }]}>Check no</Text>
                    <Text style={[s.cell, s.th, { width: 100 }]}>Employer</Text>
                    <Text style={[s.cell, s.th, { width: 110 }]}>Contact</Text>
                    <Text style={[s.cell, s.th, { width: 120, textAlign: 'right' }]}>Amount to be paid</Text>
                    <Text style={[s.cell, s.th, { width: 130, textAlign: 'right' }]}>Paid amount (This month)</Text>
                    <Text style={[s.cell, s.th, { width: 100, textAlign: 'right' }]}>Not paid</Text>
                    <Text style={[s.cell, s.th, { width: 120, textAlign: 'right' }]}>Outstanding (Total)</Text>
                  </View>

                  {/* ── Data rows ── */}
                  {rows.map((r: any, i: number) => (
                    <View key={i} style={[s.row, i % 2 === 1 && s.rowAlt]}>
                      <Text style={[s.cell, { width: 40,  textAlign: 'center', color: Colors.textMuted }]}>{r.sn ?? i+1}</Text>
                      <View style={[s.cell, { width: 165, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                        <Text style={{ fontWeight: '500', fontSize: 11, color: Colors.text, flexShrink: 1 }} numberOfLines={1}>{r.name}</Text>
                        {r.is_overdue_loan && (
                          <View style={s.hamaBadge}>
                            <Text style={s.hamaBadgeText}>HAMA</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[s.cell, { width: 90,  color: Colors.textMuted }]}>{r.check_no}</Text>
                      <Text style={[s.cell, { width: 100, color: Colors.textMuted }]} numberOfLines={1}>{r.employer}</Text>
                      <Text style={[s.cell, { width: 110, color: Colors.textMuted }]}>{r.contact}</Text>
                      <Text style={[s.cell, { width: 120, textAlign: 'right' }]}>{fmtN(r.amount_to_be_paid)}</Text>
                      <Text style={[s.cell, { width: 130, textAlign: 'right', color: Number(r.paid_this_month) > 0 ? Colors.success : Colors.textMuted }]}>
                        {fmtN(r.paid_this_month)}
                      </Text>
                      <Text style={[s.cell, { width: 100, textAlign: 'right', fontWeight: '700', color: Colors.error }]}>
                        {fmtN(r.not_paid)}
                      </Text>
                      <Text style={[s.cell, { width: 120, textAlign: 'right', color: Colors.error }]}>
                        {fmtN(r.outstanding_total)}
                      </Text>
                    </View>
                  ))}

                  {/* ── Total footer row — reflects filtered/visible rows ── */}
                  <View style={[s.row, s.tfoot]}>
                    <Text style={[s.cell, s.tfootText, { width: 40+165+90+100+110 }]}>Total</Text>
                    <Text style={[s.cell, s.tfootText, { width: 120, textAlign: 'right' }]}>{fmtN(filteredTotals.amount_to_be_paid)}</Text>
                    <Text style={[s.cell, s.tfootText, { width: 130, textAlign: 'right' }]}>{fmtN(filteredTotals.paid_this_month)}</Text>
                    <Text style={[s.cell, s.tfootText, { width: 100, textAlign: 'right' }]}>{fmtN(filteredTotals.not_paid)}</Text>
                    <Text style={[s.cell, s.tfootText, { width: 120, textAlign: 'right' }]}>{fmtN(filteredTotals.outstanding_total)}</Text>
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
  hamaBadge: { backgroundColor: '#e74c3c', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  hamaBadgeText: { color: '#fff', fontSize: 8, fontWeight: '700' },
  filterCard: {
    backgroundColor: Colors.surface, margin: Spacing.base,
    borderRadius: Radius.lg, padding: Spacing.base,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6,
  },
  filterLabel: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: Typography.sizes.base,
    color: Colors.text, backgroundColor: Colors.surface, marginBottom: 6,
  },
  datePreview: { fontSize: 12, color: Colors.textSecondary, marginBottom: 10 },
  dateError:   { fontSize: 12, color: Colors.error, marginBottom: 10 },
  searchBtn:     { backgroundColor: NAVY, borderRadius: Radius.md, paddingVertical: 11, alignItems: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Name search box — appears below month picker once data is loaded
  nameSearchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, marginHorizontal: Spacing.base, marginBottom: Spacing.sm,
    borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 2,
  },
  nameSearchIcon: { fontSize: 14 },
  nameSearchInput: { flex: 1, fontSize: 13, color: Colors.text, paddingVertical: 10 },
  nameSearchClear: { fontSize: 14, color: Colors.textMuted, padding: 4 },
  resultsCount: { textAlign: 'center', fontSize: 11, color: Colors.textMuted, marginBottom: Spacing.sm, fontWeight: '500' },

  branchTitle:  { textAlign: 'center', fontSize: 13, fontWeight: '700', color: NAVY, marginTop: Spacing.sm, textDecorationLine: 'underline' },
  reportTitle:  { textAlign: 'center', fontSize: 12, fontWeight: '800', color: NAVY, textDecorationLine: 'underline', marginBottom: Spacing.xs, letterSpacing: 0.3 },

  table:    { borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowAlt:   { backgroundColor: '#f0f8fa' },
  thead:    { backgroundColor: TEAL, borderBottomWidth: 2, borderBottomColor: '#4aa8c4' },
  tfoot:    { backgroundColor: GOLD, borderBottomWidth: 0 },
  cell:     { fontSize: 11, color: Colors.text, paddingHorizontal: 4 },
  th:       { color: '#fff', fontWeight: '700', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.2 },
  tfootText:{ color: '#1a1a1a', fontWeight: '800', fontSize: 11 },

  emptyBox:  { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
});
