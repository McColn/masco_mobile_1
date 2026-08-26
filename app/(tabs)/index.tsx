import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Dimensions,
  Modal, TextInput, Animated,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { AppHeader } from '@/components/common/AppHeader';
import { DrawerMenu } from '@/components/common/DrawerMenu';
import { DateInput } from '@/components/ui/DateInput';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { DashboardService } from '@/lib/services';
import { QK } from '@/lib/queryClient';
import { formatTZS, getTodayLocal } from '@/lib/format';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore, selectIsHQUser, selectIsHQView } from '@/store/branchStore';
import { useDrawer } from '@/lib/drawerContext';

const { width: W } = Dimensions.get('window');
const CARD_W = W - Spacing.base * 2;
const TEAL = '#0da9a9';

// ─── Date Picker Modal ────────────────────────────────────────────────────────
function DatePickerModal({ visible, current, onSelect, onClose }: {
  visible: boolean; current: string;
  onSelect: (d: string) => void; onClose: () => void;
}) {
  const [val, setVal] = useState(current);

  // Build last 30 days quick-select
  const quickDates: { label: string; value: string }[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${day}`; // local date, not UTC-shifted
    const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday'
      : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    quickDates.push({ label, value: iso });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ds.modalRoot}>
        <TouchableOpacity style={ds.overlay} activeOpacity={1} onPress={onClose} />
        <View style={ds.datePicker}>
          <View style={ds.datePickerHeader}>
            <Text style={ds.datePickerTitle}>Select Date</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
              <Text style={ds.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          {/* Native calendar picker */}
          <View style={ds.dateInputRow}>
            <View style={{ flex: 1 }}>
              <DateInput value={val} onChange={setVal} placeholder="Pick a date" />
            </View>
            <TouchableOpacity
              style={ds.dateApplyBtn}
              onPress={() => { onSelect(val); onClose(); }}
            >
              <Text style={ds.dateApplyText}>Apply</Text>
            </TouchableOpacity>
          </View>
          {/* Quick select */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {quickDates.map(d => (
              <TouchableOpacity
                key={d.value}
                style={[ds.quickDateRow, d.value === current && ds.quickDateActive]}
                onPress={() => { onSelect(d.value); onClose(); }}
              >
                <Text style={[ds.quickDateLabel, d.value === current && { color: Colors.primary, fontWeight: Typography.weights.bold }]}>
                  {d.label}
                </Text>
                <Text style={ds.quickDateValue}>{d.value}</Text>
                {d.value === current && <Text style={{ color: Colors.primary }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Animated "🔥 NEW" badge — mirrors web dashboard's .activity-badge
//    (red/orange gradient, subtle pulse). Shown on every row with amount > 0,
//    regardless of whether the user is viewing today's or a previous date. ──
function NewBadge() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);
  return (
    <Animated.View style={[ds.newBadge, { transform: [{ scale: pulse }] }]}>
      <Text style={ds.newBadgeText}>🔥 NEW</Text>
    </Animated.View>
  );
}

// ─── Summary Card (teal, per-branch rows) — shared by both HQ and branch
//     dashboard views; rows navigate to the matching detail report when
//     reportType + a non-zero amount are present ──────────────────────────
function SummaryCard({ icon, title, total, rows, isLoading, reportType, selectedDate }: {
  icon: string; title: string; total: number;
  rows: { office: string; amount: number; count: number }[];
  isLoading?: boolean;
  reportType?: 'loans' | 'expenses' | 'repayments' | 'transactions';
  selectedDate?: string;
}) {
  const handleRowPress = (office: string, amount: number) => {
    if (!reportType || amount === 0) return;
    const params = `?office=${encodeURIComponent(office)}&date=${selectedDate || ''}`;
    router.push(`/hq/reports/detail/${reportType}${params}` as any);
  };

  return (
    <View style={[ds.summaryCard, { width: CARD_W }]}>
      <View style={ds.summaryHeader}>
        <View style={ds.summaryIconCircle}>
          <Text style={{ fontSize: 20 }}>{icon}</Text>
        </View>
        <View>
          <Text style={ds.summaryTitle}>{title}</Text>
          <Text style={ds.summaryTotal}>Total: {formatTZS(total)}</Text>
        </View>
      </View>
      {isLoading ? (
        <ActivityIndicator color={TEAL} style={{ padding: 20 }} />
      ) : rows.length === 0 ? (
        // Should be unreachable now that fillMissingOffices guarantees every
        // known branch is listed — kept only as a true last-resort fallback
        // for accounts with zero registered offices.
        <View style={ds.summaryEmpty}>
          <Text style={ds.summaryEmptyText}>No branches configured</Text>
        </View>
      ) : (
        rows.map((row, i) => (
          <TouchableOpacity key={row.office}
            style={[ds.summaryRow, i % 2 === 1 && ds.summaryRowAlt, reportType && ds.summaryRowTappable]}
            onPress={() => reportType && row.amount > 0 && handleRowPress(row.office, row.amount)}
            activeOpacity={reportType && row.amount > 0 ? 0.7 : 1}>
            <Text style={ds.summaryOfficeName}>{row.office}</Text>
            <Text style={[ds.summaryAmount, row.amount === 0 && { color: Colors.textMuted }]}>
              {row.amount === 0 ? '—' : formatTZS(row.amount)}
            </Text>
            <View style={[ds.summaryBadge, row.count === 0 && { backgroundColor: 'transparent' }]}>
              <Text style={[ds.summaryBadgeText, row.count === 0 && { color: Colors.textMuted }]}>
                [{row.count}]
              </Text>
            </View>
            {row.amount > 0 && <NewBadge />}
            {reportType && row.amount > 0 && (
              <Text style={{ fontSize: 10, color: TEAL, marginLeft: 4 }}>›</Text>
            )}
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

// ─── Branch mini card ─────────────────────────────────────────────────────────
function MiniCard({ icon, title, amount, count, color, onPress }: {
  icon: string; title: string; amount: number; count: number;
  color: string; onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[ds.miniCard, { borderTopColor: color, borderTopWidth: 3 }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
    >
      <View style={[ds.miniIcon, { backgroundColor: color + '18' }]}>
        <Text style={{ fontSize: 22 }}>{icon}</Text>
      </View>
      <Text style={[ds.miniAmount, { color }]}>{formatTZS(amount)}</Text>
      <Text style={ds.miniTitle}>{title}</Text>
      <Text style={[ds.miniCount, { color }]}>{count} records</Text>
    </TouchableOpacity>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { user }   = useAuthStore();
  const { selectedBranch, viewingHQ, branches } = useBranchStore();
  const { open, isOpen, close } = useDrawer();

  const isHQUser = selectIsHQUser(user?.is_superuser ?? false, branches.length);
  const isHQView = selectIsHQView(user?.is_superuser ?? false, viewingHQ, branches.length);

  const today    = getTodayLocal();
  const [selectedDate, setSelectedDate] = useState(today);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // HQ-capable users (superuser or multi-branch) always see the all-branches
  // summary on the home dashboard, regardless of which branch they have selected
  // for transactional screens. Only pure branch users (single office, not superuser)
  // get their dashboard scoped to their own office.
  const dashboardOfficeId = isHQUser ? undefined : selectedBranch?.id;

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard', isHQUser ? 'hq-all' : selectedBranch?.id, selectedDate],
    queryFn: () => DashboardService.getStats({
      office_id: dashboardOfficeId,
      date: selectedDate,
    }),
    staleTime: 0,              // always fetch fresh — dashboard data changes frequently
    refetchOnWindowFocus: true,
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Habari za Asubuhi' : hour < 17 ? 'Habari za Mchana' : 'Habari za Jioni';
  const firstName = user?.full_name?.split(' ')[0] || user?.username || 'User';

  // Format display date
  const displayDate = selectedDate === today
    ? 'Today'
    : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      });

  // Client-side safety net: if the API ever returns fewer rows than known
  // offices (or none at all), fill in the missing branches with zero values
  // so the UI always lists every branch and never falls back to a blank
  // "No records" message.
  const fillMissingOffices = (rows: any[]): any[] => {
    if (!isHQUser || branches.length === 0) return rows;
    const present = new Set(rows.map(r => r.office));
    const missing = branches
      .filter(b => !present.has(b.name))
      .map(b => ({ office: b.name, amount: 0, count: 0 }));
    return [...rows, ...missing].sort((a, b) => a.office.localeCompare(b.office));
  };

  const loansRows        = fillMissingOffices((data?.loans_today        ?? []) as any[]);
  const repaymentsRows   = fillMissingOffices((data?.repayments_today   ?? []) as any[]);
  const expensesRows     = fillMissingOffices((data?.expenses_today     ?? []) as any[]);
  const transactionsRows = fillMissingOffices((data?.transactions_today ?? []) as any[]);

  const scrollRef = useRef<ScrollView>(null);
  const [activeCard, setActiveCard] = useState(0);
  const cards = [
    { icon: '💰', title: 'Loans Processed', rows: loansRows,        total: data?.loans_total_today ?? 0,        reportType: 'loans'        as const },
    { icon: '🧾', title: 'Expenses',         rows: expensesRows,     total: data?.expenses_total_today ?? 0,     reportType: 'expenses'     as const },
    { icon: '💳', title: 'Repayments',       rows: repaymentsRows,   total: data?.repayments_total_today ?? 0,   reportType: 'repayments'   as const },
    { icon: '🔄', title: 'Transactions',     rows: transactionsRows, total: data?.transactions_total_today ?? 0, reportType: 'transactions' as const },
  ];

  return (
    <View style={ds.root}>
      <AppHeader title="Dashboard" onMenuPress={open}
        rightAction={
          <TouchableOpacity style={ds.avatar} onPress={() => router.push('/(tabs)/profile' as any)}>
            <Text style={ds.avatarText}>
              {user?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={ds.scroll}
        contentContainerStyle={ds.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
      >
        {/* ── Title row with date picker ── */}
        <View style={ds.titleRow}>
          <View style={ds.titleLeft}>
            <Text style={ds.titleLabel}>Summary for</Text>
          </View>
          <TouchableOpacity style={ds.datePill} onPress={() => setDatePickerOpen(true)} activeOpacity={0.8}>
            <Text style={ds.datePillIcon}>📅</Text>
            <Text style={ds.datePillText}>{displayDate}</Text>
            <Text style={ds.datePillArrow}>▾</Text>
          </TouchableOpacity>
        </View>

        {/* Branch banner — when HQ user views a branch */}
        {isHQUser && !isHQView && selectedBranch && (
          <View style={ds.branchBanner}>
            <Text style={ds.branchBannerIcon}>🏦</Text>
            <Text style={ds.branchBannerName}>{selectedBranch.name}</Text>
            <Text style={ds.branchBannerSep}>·</Text>
            <Text style={ds.branchBannerHint}>Branch View</Text>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════
             HQ VIEW — horizontal swipe cards with branch breakdown
        ══════════════════════════════════════════════════════════ */}
        {isHQView ? (
          <>
            {/* Horizontal scrolling cards */}
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={CARD_W + Spacing.sm}
              onMomentumScrollEnd={e => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_W + Spacing.sm));
                setActiveCard(idx);
              }}
              contentContainerStyle={ds.cardsScroll}
            >
              {cards.map(c => (
                <SummaryCard
                  key={c.title}
                  icon={c.icon}
                  title={c.title}
                  total={c.total}
                  rows={c.rows}
                  isLoading={isLoading}
                  reportType={c.reportType}
                  selectedDate={selectedDate}
                />
              ))}
            </ScrollView>

            {/* Dot indicator */}
            <View style={ds.dots}>
              {cards.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    scrollRef.current?.scrollTo({ x: i * (CARD_W + Spacing.sm), animated: true });
                    setActiveCard(i);
                  }}
                >
                  <View style={[ds.dot, i === activeCard && ds.dotActive]} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Overall totals strip */}
            <View style={ds.totalsStrip}>
              {[
                { label: 'Clients',      value: String(data?.total_clients ?? 0),       color: Colors.primary },
                { label: 'Active Loans', value: String(data?.total_active_loans ?? 0),   color: Colors.teal },
                { label: 'Outstanding',  value: formatTZS(data?.total_outstanding ?? 0), color: Colors.error },
              ].map((item, i, arr) => (
                <React.Fragment key={item.label}>
                  <View style={ds.totalItem}>
                    <Text style={[ds.totalValue, { color: item.color }]}>{item.value}</Text>
                    <Text style={ds.totalLabel}>{item.label}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={ds.totalDivider} />}
                </React.Fragment>
              ))}
            </View>
          </>
        ) : (
          /* ══════════════════════════════════════════════════════════
               BRANCH VIEW — same 4-card teal style as HQ, branch data only
          ══════════════════════════════════════════════════════════ */
          <>
            {isLoading ? (
              <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
            ) : (
              <>
                {/* Branch label */}
                <Text style={[ds.sectionTitle, { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm }]}>
                  {selectedBranch?.name || user?.office || 'Branch'} — {displayDate}
                </Text>

                {/* Same 4 teal cards as HQ, swiped horizontally — now using
                    the shared SummaryCard component so rows are tappable
                    here too, navigating to the same detail screens HQ uses */}
                <ScrollView
                  ref={scrollRef}
                  horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  snapToInterval={CARD_W + Spacing.sm}
                  onMomentumScrollEnd={e => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_W + Spacing.sm));
                    setActiveCard(idx);
                  }}
                  contentContainerStyle={ds.cardsScroll}
                >
                  {[
                    { icon: '💰', title: 'Loans Processed', rows: loansRows,        total: data?.loans_total_today ?? 0,        reportType: 'loans'        as const },
                    { icon: '💳', title: 'Repayments',       rows: repaymentsRows,   total: data?.repayments_total_today ?? 0,   reportType: 'repayments'   as const },
                    { icon: '🧾', title: 'Expenses',         rows: expensesRows,     total: data?.expenses_total_today ?? 0,     reportType: 'expenses'     as const },
                    { icon: '🔄', title: 'Transactions',     rows: transactionsRows, total: data?.transactions_total_today ?? 0, reportType: 'transactions' as const },
                  ].map(c => (
                    <SummaryCard
                      key={c.title}
                      icon={c.icon}
                      title={c.title}
                      total={c.total}
                      rows={c.rows}
                      isLoading={isLoading}
                      reportType={c.reportType}
                      selectedDate={selectedDate}
                    />
                  ))}
                </ScrollView>

                {/* Dot indicator */}
                <View style={ds.dots}>
                  {[0,1,2,3].map((_, i) => (
                    <TouchableOpacity key={i} onPress={() => { scrollRef.current?.scrollTo({ x: i*(CARD_W+Spacing.sm), animated: true }); setActiveCard(i); }}>
                      <View style={[ds.dot, i === activeCard && ds.dotActive]} />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Totals strip */}
                <View style={ds.totalsStrip}>
                  {[
                    { label: 'Clients',      value: String(data?.total_clients ?? 0),       color: Colors.primary },
                    { label: 'Active Loans', value: String(data?.total_active_loans ?? 0),   color: TEAL },
                    { label: 'Outstanding',  value: formatTZS(data?.total_outstanding ?? 0), color: Colors.error },
                  ].map((item, i, arr) => (
                    <React.Fragment key={item.label}>
                      <View style={ds.totalItem}>
                        <Text style={[ds.totalValue, { color: item.color }]}>{item.value}</Text>
                        <Text style={ds.totalLabel}>{item.label}</Text>
                      </View>
                      {i < arr.length - 1 && <View style={ds.totalDivider} />}
                    </React.Fragment>
                  ))}
                </View>

                {/* Quick actions */}
                <Text style={ds.sectionTitle}>Quick Actions</Text>
                <View style={ds.quickGrid}>
                  {[
                    { icon: '💰', label: 'New Loan',    color: Colors.primary, route: '/loans/new' },
                    { icon: '👤', label: 'New Client',  color: Colors.teal,    route: '/clients/new' },
                    { icon: '💳', label: 'Pay Loan',    color: Colors.success, route: '/branch/loan-payment' },
                    { icon: '🧾', label: 'Expense',     color: Colors.error,   route: '/expenses/new' },
                    { icon: '📊', label: 'Reports',     color: TEAL,           route: '/reports/index' },
                    { icon: '📋', label: 'Schedule',    color: Colors.warning, route: '/branch/reports/repayment-schedule' },
                  ].map(a => (
                    <TouchableOpacity key={a.label} style={ds.quickItem} onPress={() => router.push(a.route as any)} activeOpacity={0.8}>
                      <View style={[ds.quickIcon, { backgroundColor: a.color + '18' }]}>
                        <Text style={{ fontSize: 20 }}>{a.icon}</Text>
                      </View>
                      <Text style={ds.quickLabel}>{a.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Date picker modal */}
      <DatePickerModal
        visible={datePickerOpen}
        current={selectedDate}
        onSelect={setSelectedDate}
        onClose={() => setDatePickerOpen(false)}
      />

      <DrawerMenu key={`${selectedBranch?.id}-${viewingHQ}`} visible={isOpen} onClose={close} />
    </View>
  );
}

const ds = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingBottom: 48 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Title row
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md },
  titleLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  titleLabel: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.text },
  datePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primary + '12', borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1.5, borderColor: Colors.primary + '30',
  },
  datePillIcon: { fontSize: 14 },
  datePillText: { fontSize: Typography.sizes.sm, color: Colors.primary, fontWeight: Typography.weights.semibold },
  datePillArrow: { fontSize: 10, color: Colors.primary },

  // Branch banner
  branchBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: Spacing.base, marginBottom: Spacing.sm,
    backgroundColor: Colors.accent + '15', borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.accent + '30',
    borderLeftWidth: 4, borderLeftColor: Colors.accent,
  },
  branchBannerIcon: { fontSize: 16 },
  branchBannerName: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.accent },
  branchBannerSep: { color: Colors.textMuted },
  branchBannerHint: { fontSize: Typography.sizes.xs, color: Colors.textMuted },

  // HQ cards
  cardsScroll: { paddingHorizontal: Spacing.base, gap: Spacing.sm, paddingRight: Spacing.base + Spacing.sm },
  summaryCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, overflow: 'hidden', ...Shadow.md },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: TEAL, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md },
  summaryIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { color: '#fff', fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold },
  summaryTotal: { color: 'rgba(255,255,255,0.85)', fontSize: Typography.sizes.sm },
  summaryRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.border },
  summaryRowAlt: { backgroundColor: Colors.surfaceAlt },
  summaryOfficeName: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.text, fontWeight: Typography.weights.medium },
  summaryAmount: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.text, marginRight: 8 },
  summaryBadge: { backgroundColor: TEAL + '20', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  summaryBadgeText: { fontSize: 10, color: TEAL, fontWeight: Typography.weights.bold },
  // "🔥 NEW" pulse badge — matches the web's .activity-badge (red/orange
  // gradient equivalent using a solid warm-orange background so it works
  // consistently in React Native without a gradient library).
  newBadge: {
    marginLeft: 6, paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 10, backgroundColor: '#ff4500',
    shadowColor: '#ff6b35', shadowOpacity: 0.5, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  newBadgeText: {
    fontSize: 9, color: '#fff', fontWeight: '800',
    letterSpacing: 0.3,
  },
  summaryEmpty: { padding: Spacing.xl, alignItems: 'center' },
  summaryEmptyText: { color: Colors.textMuted, fontSize: Typography.sizes.sm },

  // Dots
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: Spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { backgroundColor: TEAL, width: 20, borderRadius: 3 },

  // Totals strip
  totalsStrip: { flexDirection: 'row', backgroundColor: Colors.surface, marginHorizontal: Spacing.base, borderRadius: Radius.lg, ...Shadow.sm, overflow: 'hidden', marginTop: Spacing.xs },
  totalItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  totalDivider: { width: 1, backgroundColor: Colors.border },
  totalValue: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.primary },
  totalLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 2 },

  // Branch mini cards
  miniGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.base, gap: Spacing.sm, marginBottom: Spacing.md },
  miniCard: { width: '47.5%', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', gap: 5, ...Shadow.sm },
  miniIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  miniAmount: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  miniTitle: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, textAlign: 'center' },
  miniCount: { fontSize: 10, fontWeight: Typography.weights.semibold },

  // Outstanding
  outstandingCard: { marginHorizontal: Spacing.base, backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.base, ...Shadow.md, marginBottom: Spacing.md },
  outstandingLabel: { color: 'rgba(255,255,255,0.75)', fontSize: Typography.sizes.sm },
  outstandingValue: { color: '#fff', fontSize: 26, fontWeight: Typography.weights.bold, marginTop: 2, marginBottom: 12 },
  outstandingRow: { flexDirection: 'row' },
  outstandingItem: { flex: 1, alignItems: 'center' },
  outstandingDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  outstandingItemValue: { color: '#fff', fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold },
  outstandingItemLabel: { color: 'rgba(255,255,255,0.65)', fontSize: Typography.sizes.xs, marginTop: 2 },

  // Quick actions
  sectionTitle: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.text, paddingHorizontal: Spacing.base, paddingBottom: Spacing.xs },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.base, gap: Spacing.sm },
  quickItem: { width: '30.5%', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.sm, alignItems: 'center', gap: 5, ...Shadow.sm },
  quickIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, textAlign: 'center', fontWeight: Typography.weights.semibold },

  // Date picker modal
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.overlay },
  datePicker: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  datePickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  datePickerTitle: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.text },
  closeBtn: { fontSize: 18, color: Colors.textMuted, padding: 4 },
  dateInputRow: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dateInput: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 9, fontSize: Typography.sizes.sm, color: Colors.text, backgroundColor: Colors.surfaceAlt },
  dateApplyBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: 16, justifyContent: 'center' },
  dateApplyText: { color: '#fff', fontWeight: Typography.weights.bold, fontSize: Typography.sizes.sm },
  quickDateRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.border },
  quickDateActive: { backgroundColor: Colors.primary + '08' },
  quickDateLabel: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.text },
  quickDateValue: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginRight: 8 },
});
