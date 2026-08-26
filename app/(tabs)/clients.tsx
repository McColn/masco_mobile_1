import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';

import { ScreenLayout } from '@/components/common/ScreenLayout';
import { ClientRow } from '@/components/common/ClientRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { ClientService } from '@/lib/services';
import { QK } from '@/lib/queryClient';
import { useDebounce } from '@/hooks/useDebounce';
import { useBranchStore } from '@/store/branchStore';

export default function ClientsScreen() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const { selectedBranch } = useBranchStore();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: QK.clients(selectedBranch?.id, debouncedSearch),
      queryFn: ({ pageParam = 1 }) =>
        ClientService.list({ page: pageParam as number, search: debouncedSearch }),
      getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
      initialPageParam: 1,
    });

  const clients = data?.pages.flatMap((p) => p.results) ?? [];

  return (
    <ScreenLayout
      title="Clients"
      subtitle={`${data?.pages[0]?.count ?? 0} total`}
      rightAction={
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/clients/new')}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, phone, ID..."
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

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(i) => String(i.id)}
          renderItem={({ item }) => (
            <ClientRow client={item} onPress={() => router.push(`/clients/${item.id}` as any)} />
          )}
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
            <EmptyState icon="👥" title="No Clients Found"
              description={search ? "No clients match your search." : "No clients registered yet."} />
          }
        />
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 22, lineHeight: 26 },
  searchRow: { padding: Spacing.base, paddingBottom: Spacing.sm },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, height: 44,
    borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.text },
  clearIcon: { color: Colors.textMuted, fontSize: 13, paddingLeft: 8 },
  list: { paddingHorizontal: Spacing.base, paddingBottom: 40 },
});
