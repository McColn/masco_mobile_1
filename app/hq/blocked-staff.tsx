// Fix 7: Blocked Staff — lists all blocked staff with unblock option
import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { StaffService } from '@/lib/services';
import api from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';

export default function BlockedStaffScreen() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['staff-all-blocked'],
    queryFn: StaffService.list,
  });

  const { mutate: unblock, isPending } = useMutation({
    mutationFn: (id: number) => api.post('/staff/block/', { user_id: id, block: false }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-all-blocked'] });
      Toast.show({ type: 'success', text1: 'Staff Unblocked', text2: 'Account has been reactivated.' });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Unblock failed' }),
  });

  const all: any[] = Array.isArray(data) ? data : [];

  // Only blocked staff
  const blocked = all.filter(s => !s.is_active);
  const filtered = debouncedSearch
    ? blocked.filter(s =>
        s.full_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        s.office?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        s.username?.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : blocked;

  const confirmUnblock = (item: any) => {
    Alert.alert(
      'Unblock Staff',
      `Restore access for ${item.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unblock', onPress: () => unblock(item.id) },
      ]
    );
  };

  return (
    <ScreenLayout
      title="Blocked Staff"
      subtitle={`${blocked.length} blocked`}
      showBack
    >
      {/* Stats banner */}
      <View style={styles.statsBanner}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: Colors.error }]}>{blocked.length}</Text>
          <Text style={styles.statLabel}>Blocked</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: Colors.success }]}>{all.length - blocked.length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{all.length}</Text>
          <Text style={styles.statLabel}>Total Staff</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search blocked staff..."
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

      {isLoading
        ? <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
        : (
          <FlatList
            data={filtered}
            keyExtractor={i => String(i.id)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={{ fontSize: 48 }}>✅</Text>
                <Text style={styles.emptyTitle}>
                  {debouncedSearch ? 'No results found' : 'No Blocked Staff'}
                </Text>
                <Text style={styles.emptyText}>
                  {debouncedSearch ? 'Try a different search term.' : 'All staff members are currently active.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.row}>
                {/* Red avatar to indicate blocked */}
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.full_name?.split(' ').map((n:string)=>n[0]).join('').slice(0,2)||'??'}
                  </Text>
                </View>
                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{item.full_name}</Text>
                    <View style={styles.blockedBadge}>
                      <Text style={styles.blockedBadgeText}>🚫 Blocked</Text>
                    </View>
                  </View>
                  <Text style={styles.sub}>@{item.username} · {item.office || 'Unassigned'}</Text>
                  <Text style={styles.contact}>{item.phone || item.email || '—'}</Text>
                  <Text style={styles.role}>{item.role || 'Staff'}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.unblockBtn, isPending && { opacity: 0.6 }]}
                  onPress={() => confirmUnblock(item)}
                  disabled={isPending}
                >
                  <Text style={styles.unblockBtnText}>Unblock</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  statsBanner: { flexDirection: 'row', backgroundColor: Colors.surface, margin: Spacing.base, marginBottom: 0, borderRadius: Radius.lg, ...Shadow.sm, overflow: 'hidden' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statDivider: { width: 1, backgroundColor: Colors.border },
  statValue: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.primary },
  statLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 2 },
  searchRow: { padding: Spacing.base, paddingBottom: Spacing.sm },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, height: 44, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.text },
  clearIcon: { color: Colors.textMuted, fontSize: 13 },
  list: { paddingHorizontal: Spacing.base, gap: Spacing.sm, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, ...Shadow.sm, borderWidth: 1, borderColor: Colors.error+'20' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.errorLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: Colors.error, fontWeight: '700', fontSize: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  info: { flex: 1 },
  name: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.text },
  blockedBadge: { backgroundColor: Colors.errorLight, borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  blockedBadgeText: { fontSize: 9, color: Colors.error, fontWeight: Typography.weights.bold },
  sub: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 2 },
  contact: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  role: { fontSize: Typography.sizes.xs, color: Colors.primary, marginTop: 1 },
  unblockBtn: { backgroundColor: Colors.successLight, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.success+'40' },
  unblockBtnText: { fontSize: 11, color: Colors.success, fontWeight: Typography.weights.bold },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyTitle: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.text },
  emptyText: { fontSize: Typography.sizes.sm, color: Colors.textMuted, textAlign: 'center' },
});
