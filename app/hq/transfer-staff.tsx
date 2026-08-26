import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { OfficePickerModal } from '@/components/common/OfficePickerModal';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { StaffService } from '@/lib/services';
import { useOffices } from '@/hooks/useOffices';
import { useDebounce } from '@/hooks/useDebounce';
import api from '@/lib/api';
import type { Office } from '@/lib/types';

export default function TransferStaffScreen() {
  const qc = useQueryClient();
  const { offices, isLoading: loadingOffices } = useOffices();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  // Per-staff transfer state
  const [pickerStaff, setPickerStaff] = useState<any>(null);  // which staff we're transferring
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['staff-transfer-list'],
    queryFn: StaffService.list,
  });

  const { mutate: transfer, isPending } = useMutation({
    mutationFn: ({ staffId, office }: { staffId: number; office: Office }) =>
      api.post('/staff/transfer/', { user_id: staffId, office_id: office.id }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['staff-transfer-list'] });
      Toast.show({ type: 'success', text1: 'Staff Transferred', text2: `Moved to ${vars.office.name}` });
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: 'Transfer failed', text2: e?.response?.data?.detail || 'Error' }),
  });

  const all: any[] = Array.isArray(data) ? data.filter((s: any) => s.is_active) : [];
  const staff = debouncedSearch
    ? all.filter(s => s.full_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) || s.office?.toLowerCase().includes(debouncedSearch.toLowerCase()))
    : all;

  const handleTransfer = (office: Office) => {
    if (pickerStaff) {
      transfer({ staffId: pickerStaff.id, office });
    }
    setPickerStaff(null);
  };

  return (
    <ScreenLayout title="Transfer Staff" subtitle={`${all.length} active`} showBack>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text>🔍 </Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search staff or branch..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ color: Colors.textMuted }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading
        ? <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
        : (
          <FlatList
            data={staff}
            keyExtractor={i => String(i.id)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
            ListEmptyComponent={<Text style={styles.empty}>No active staff found.</Text>}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.full_name?.split(' ').map((n:string)=>n[0]).join('').slice(0,2)||'??'}
                  </Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.full_name}</Text>
                  <Text style={styles.sub}>📍 {item.office || 'Unassigned'}</Text>
                  <Text style={styles.role}>{item.role || 'Staff'}</Text>
                </View>
                <TouchableOpacity
                  style={styles.transferChip}
                  onPress={() => { setPickerStaff(item); setPickerOpen(true); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.transferChipText}>🔄 Transfer</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}

      <OfficePickerModal
        visible={pickerOpen}
        onClose={() => { setPickerOpen(false); setPickerStaff(null); }}
        offices={offices}
        isLoading={loadingOffices}
        excludeName={pickerStaff?.office}
        onSelect={handleTransfer}
        title={`Transfer: ${pickerStaff?.full_name || ''}`}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  searchRow: { padding: Spacing.base, paddingBottom: Spacing.sm },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, height: 44, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  searchInput: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.text },
  list: { padding: Spacing.base, paddingTop: 0, gap: Spacing.sm, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.teal+'20', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: Colors.teal, fontWeight: '700', fontSize: 14 },
  info: { flex: 1 },
  name: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.text },
  sub: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 1 },
  role: { fontSize: Typography.sizes.xs, color: Colors.primary },
  transferChip: { backgroundColor: Colors.primary+'12', borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: Colors.primary+'30' },
  transferChipText: { fontSize: 11, color: Colors.primary, fontWeight: Typography.weights.bold },
  empty: { textAlign: 'center', color: Colors.textMuted, padding: 40 },
});
