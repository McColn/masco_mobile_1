import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';

import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { SalaryService } from '@/lib/services';
import { QK } from '@/lib/queryClient';
import { formatTZS, formatDate } from '@/lib/format';
import type { Salary } from '@/lib/types';

function SalaryRow({ item }: { item: Salary }) {
  return (
    <Card style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={styles.name} numberOfLines={1}>
          {item.employee_name ?? `Mfanyakazi #${item.id}`}
        </Text>
        <Text style={styles.amount}>{formatTZS(Number(item.net_salary ?? item.gross_salary))}</Text>
      </View>
      <View style={styles.rowBottom}>
        <Text style={styles.meta}>
          Jumla: {formatTZS(Number(item.gross_salary))}
        </Text>
        <Text style={styles.date}>{formatDate(item.payment_date)}</Text>
      </View>
    </Card>
  );
}

export default function SalariesScreen() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: QK.salaries(),
    queryFn: ({ pageParam = 1 }) => SalaryService.list({ page: pageParam as number }),
    getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
    initialPageParam: 1,
  });

  const items = data?.pages.flatMap((p) => p.results) ?? [];

  return (
    <View style={styles.container}>
      <ScreenLayout title="Mishahara" subtitle="Malipo ya wafanyakazi" showBack />

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={Colors.gold} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => <SalaryRow item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.gold} />
          }
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={Colors.gold} style={{ padding: Spacing.md }} />
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="💰"
              title="Hakuna Mishahara"
              description="Hakuna rekodi za mishahara zilizohifadhiwa."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: Spacing.md, paddingBottom: Spacing['3xl'] },
  row: { marginBottom: Spacing.sm },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold as any,
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  amount: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold as any,
    color: Colors.teal,
  },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  meta: { fontSize: Typography.sizes.sm, color: Colors.textMuted },
  date: { fontSize: Typography.sizes.sm, color: Colors.textMuted },
});
