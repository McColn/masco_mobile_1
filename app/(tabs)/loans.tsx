import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';

import { ScreenLayout } from '@/components/common/ScreenLayout';
import { LoanCard } from '@/components/common/LoanCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { LoanService } from '@/lib/services';
import { QK } from '@/lib/queryClient';
import { useDebounce } from '@/hooks/useDebounce';
import { useBranchStore } from '@/store/branchStore';

const STATUS_FILTERS = [
  { label: 'All',       value: '' },
  { label: 'Active',    value: 'active' },
  { label: 'Pending',   value: 'pending' },
  { label: 'Completed', value: 'completed' },
  { label: 'Overdue',   value: 'overdue' },
];

export default function LoansScreen() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const { selectedBranch } = useBranchStore();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: QK.loans(selectedBranch?.id, statusFilter, debouncedSearch),
      queryFn: ({ pageParam = 1 }) =>
        LoanService.list({ page: pageParam as number, search: debouncedSearch, status: statusFilter }),
      getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
      initialPageParam: 1,
    });

  const loans = data?.pages.flatMap((p) => p.results) ?? [];

  return (
    <ScreenLayout
      title="Loans"
      rightAction={
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/loans/new')}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      }
    >
      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search loans..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status filter chips */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, statusFilter === f.value && styles.filterChipActive]}
            onPress={() => setStatusFilter(f.value)}
          >
            <Text style={[styles.filterText, statusFilter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={loans}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => (
            <LoanCard loan={item} onPress={() => router.push(`/loans/${item.id}` as any)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
          }
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={Colors.primary} style={{ padding: Spacing.md }} />
            ) : null
          }
          ListEmptyComponent={
            <EmptyState icon="💰" title="No Loans Found"
              description={search ? "No loans match your search." : "No loans recorded yet."} />
          }
        />
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 22, lineHeight: 26 },
  searchRow: { padding: Spacing.base, paddingBottom: Spacing.sm },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, height: 44,
    borderWidth: 1, borderColor: Colors.border,
    ...Shadow.sm,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.text },
  clearIcon: { color: Colors.textMuted, fontSize: 13, paddingLeft: 8 },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm, gap: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1.5,
    borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, fontWeight: Typography.weights.medium },
  filterTextActive: { color: '#fff', fontWeight: Typography.weights.semibold },
  list: { padding: Spacing.base, paddingTop: 0, paddingBottom: 40 },
});
