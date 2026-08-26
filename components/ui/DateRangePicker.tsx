// Reusable date range picker for report screens — both dates use the
// native calendar picker via DateInput (drop-in for text-typed dates).
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { DateInput } from '@/components/ui/DateInput';

interface Props {
  dateFrom: string;
  dateTo: string;
  onChangeDateFrom: (v: string) => void;
  onChangeDateTo: (v: string) => void;
  onSearch: () => void;
  loading?: boolean;
}

export function DateRangePicker({ dateFrom, dateTo, onChangeDateFrom, onChangeDateTo, onSearch, loading }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.label}>From</Text>
          <DateInput value={dateFrom} onChange={onChangeDateFrom} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>To</Text>
          <DateInput value={dateTo} onChange={onChangeDateTo} />
        </View>
      </View>
      <TouchableOpacity
        style={[styles.btn, loading && styles.btnLoading]}
        onPress={onSearch}
        disabled={loading}
      >
        <Text style={styles.btnText}>{loading ? 'Loading...' : '🔍  Generate Report'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.surface, padding: Spacing.base, margin: Spacing.base, borderRadius: Radius.lg, ...Shadow.sm },
  row: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  field: { flex: 1 },
  label: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, color: Colors.textSecondary, marginBottom: 4 },
  btn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 12, alignItems: 'center',
  },
  btnLoading: { opacity: 0.7 },
  btnText: { color: '#fff', fontWeight: Typography.weights.semibold, fontSize: Typography.sizes.sm },
});
