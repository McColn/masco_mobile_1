// Block User screen — search staff and block/unblock
import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { StaffService } from '@/lib/services';
import api from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';

export default function BlockUserScreen() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading } = useQuery({
    queryKey: ['staff-block', debouncedSearch],
    queryFn: StaffService.list,
  });

  const { mutate: toggleBlock, isPending } = useMutation({
    mutationFn: ({ id, block }: { id: number; block: boolean }) =>
      api.post('/staff/block/', { user_id: id, block }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['staff-block'] });
      Toast.show({ type: 'success', text1: vars.block ? 'User Blocked' : 'User Unblocked' });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Action failed' }),
  });

  const confirm = (item: any) => {
    const willBlock = item.is_active;
    Alert.alert(
      willBlock ? 'Block User' : 'Unblock User',
      `${willBlock ? 'Block' : 'Unblock'} ${item.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: willBlock ? 'Block' : 'Unblock', style: 'destructive',
          onPress: () => toggleBlock({ id: item.id, block: willBlock }) },
      ]
    );
  };

  const all: any[] = Array.isArray(data) ? data : [];
  const filtered = debouncedSearch
    ? all.filter(s => s.full_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) || s.username?.toLowerCase().includes(debouncedSearch.toLowerCase()))
    : all;

  return (
    <ScreenLayout title="Block User" subtitle="HQ" showBack>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search staff..."
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
            ListEmptyComponent={<Text style={styles.empty}>No staff found.</Text>}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: item.is_active ? Colors.primary + '18' : Colors.errorLight }]}>
                  <Text style={[styles.avatarText, { color: item.is_active ? Colors.primary : Colors.error }]}>
                    {item.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '??'}
                  </Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.full_name}</Text>
                  <Text style={styles.sub}>{item.office || '—'} · @{item.username}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: item.is_active ? Colors.errorLight : Colors.successLight }]}
                  onPress={() => confirm(item)}
                  disabled={isPending}
                >
                  <Text style={[styles.actionBtnText, { color: item.is_active ? Colors.error : Colors.success }]}>
                    {item.is_active ? '🚫 Block' : '✓ Unblock'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  searchRow: { padding: Spacing.base, paddingBottom: Spacing.sm },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, height: 44, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.text },
  clearIcon: { color: Colors.textMuted, fontSize: 13 },
  list: { padding: Spacing.base, paddingTop: 0, gap: Spacing.sm, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontWeight: '700', fontSize: 13 },
  info: { flex: 1 },
  name: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.text },
  sub: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 1 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full },
  actionBtnText: { fontSize: 11, fontWeight: Typography.weights.bold },
  empty: { textAlign: 'center', color: Colors.textMuted, padding: 40 },
});
