import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { formatTZS, formatDate } from '@/lib/format';
import type { LoanApplication } from '@/lib/types';

interface Props { loan: LoanApplication; onPress?: () => void; }

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Approved:  { bg: Colors.infoLight,    text: Colors.info },
  Pending:   { bg: Colors.warningLight, text: Colors.warning },
  Completed: { bg: Colors.successLight, text: Colors.success },
  Rejected:  { bg: Colors.errorLight,   text: Colors.error },
};

export function LoanCard({ loan, onPress }: Props) {
  const pct = loan.total_repayment_amount
    ? Math.min(100, Math.round(((Number(loan.total_repayment_amount) - Number(loan.repayment_amount_remaining)) / Number(loan.total_repayment_amount)) * 100))
    : 0;
  const statusColor = STATUS_COLORS[loan.status] ?? STATUS_COLORS.Pending;
  const initials = loan.client_name?.split(' ').map((n) => n[0]).join('').slice(0,2).toUpperCase() || '??';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName} numberOfLines={1}>{loan.client_name}</Text>
          <Text style={styles.clientPhone}>{loan.client_phone}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
          <Text style={[styles.badgeText, { color: statusColor.text }]}>{loan.status}</Text>
        </View>
      </View>

      {/* Amount row */}
      <View style={styles.amountRow}>
        <View>
          <Text style={styles.amountLabel}>Loan Amount</Text>
          <Text style={styles.amountValue}>{formatTZS(Number(loan.loan_amount))}</Text>
        </View>
        <View style={styles.amountDivider} />
        <View>
          <Text style={styles.amountLabel}>Outstanding</Text>
          <Text style={[styles.amountValue, { color: Colors.error }]}>
            {formatTZS(Number(loan.repayment_amount_remaining))}
          </Text>
        </View>
        <View style={styles.amountDivider} />
        <View>
          <Text style={styles.amountLabel}>Paid</Text>
          <Text style={[styles.amountValue, { color: Colors.success }]}>
            {formatTZS(Number(loan.amount_paid))}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
      </View>
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>{pct}% repaid</Text>
        <Text style={styles.dateText}>{formatDate(loan.application_date)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
    ...Shadow.sm, borderWidth: 1, borderColor: Colors.border,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: Spacing.sm },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.primary + '18', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
  clientInfo: { flex: 1 },
  clientName: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.text },
  clientPhone: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  badgeText: { fontSize: 10, fontWeight: '700' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 10 },
  amountDivider: { width: 1, height: 28, backgroundColor: Colors.border },
  amountLabel: { fontSize: 10, color: Colors.textMuted, marginBottom: 1 },
  amountValue: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.text },
  progressBg: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  progressLabel: { fontSize: 10, color: Colors.textMuted },
  dateText: { fontSize: 10, color: Colors.textMuted },
});
