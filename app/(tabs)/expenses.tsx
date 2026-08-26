import React from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { ExpenseService } from '@/lib/services';
import { QK } from '@/lib/queryClient';
import { formatTZS, formatDate } from '@/lib/format';
import { useBranchStore } from '@/store/branchStore';

function ExpenseRow({ item }: { item: any }) {
  const isBenki = item.payment_method === 'bank_transfer' || item.payment_method === 'bank';
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: isBenki ? Colors.infoLight : Colors.successLight }]}>
        <Text>{isBenki ? '🏦' : '💵'}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowDesc} numberOfLines={1}>{item.description}</Text>
        <Text style={styles.rowMeta}>{item.category_name} · {formatDate(item.expense_date)}</Text>
      </View>
      <Text style={styles.rowAmount}>{formatTZS(Number(item.amount))}</Text>
    </View>
  );
}

export default function ExpensesScreen() {
  const { selectedBranch } = useBranchStore();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: QK.expenses(selectedBranch?.id),
      queryFn: ({ pageParam = 1 }) => ExpenseService.list({ page: pageParam as number }),
      getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
      initialPageParam: 1,
    });

  const items = data?.pages.flatMap((p) => p.results) ?? [];

  return (
    <ScreenLayout
      title="Expenses"
      rightAction={
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/expenses/new')}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      }
    >
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <ExpenseRow item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
          }
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage ? <ActivityIndicator color={Colors.primary} style={{ padding: Spacing.md }} /> : null
          }
          ListEmptyComponent={
            <EmptyState icon="🧾" title="No Expenses" description="No expenses recorded yet." />
          }
        />
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 22, lineHeight: 26 },
  list: { padding: Spacing.base, paddingBottom: 40, gap: Spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, ...Shadow.sm,
  },
  rowIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1 },
  rowDesc: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.text },
  rowMeta: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 2 },
  rowAmount: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.error },
});
