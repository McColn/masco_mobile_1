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

export default function ManageBranchesScreen() {
  const qc = useQueryClient();
  const { offices, isLoading: loadingOffices } = useOffices();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [pickerStaff, setPickerStaff] = useState<any>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['staff-manage-branches'],
    queryFn: StaffService.list,
  });

  const { mutate: assign, isPending: assigning } = useMutation({
    mutationFn: ({ staffId, officeId }: { staffId: number; officeId: number }) =>
      api.post('/manage-admin-branches/add/', { user_id: staffId, office_id: officeId }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['staff-manage-branches'] });
      Toast.show({ type: 'success', text1: 'Branch Assigned' });
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: 'Failed', text2: e?.response?.data?.detail || 'Error assigning branch.' }),
  });

  const { mutate: removeAssignment } = useMutation({
    mutationFn: ({ staffId, officeId }: { staffId: number; officeId: number }) =>
      api.post('/manage-admin-branches/remove/', { user_id: staffId, office_id: officeId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff-manage-branches'] });
      Toast.show({ type: 'success', text1: 'Branch Removed' });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Remove failed' }),
  });

  const all: any[] = Array.isArray(data) ? data : [];
  const filtered = debouncedSearch
    ? all.filter(s => s.full_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) || s.office?.toLowerCase().includes(debouncedSearch.toLowerCase()))
    : all;

  const withBranch    = all.filter(s => s.office).length;
  const withoutBranch = all.length - withBranch;

  const handleAssign = (office: Office) => {
    if (pickerStaff) assign({ staffId: pickerStaff.id, officeId: office.id });
    setPickerStaff(null);
  };

  return (
    <ScreenLayout title="Manage Staff Branch" subtitle="HQ" showBack>
      {/* Stats */}
      <View style={styles.statsBanner}>
        <View style={styles.statItem}><Text style={styles.statValue}>{all.length}</Text><Text style={styles.statLabel}>Total</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}><Text style={[styles.statValue,{color:Colors.success}]}>{withBranch}</Text><Text style={styles.statLabel}>Assigned</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}><Text style={[styles.statValue,{color:Colors.warning}]}>{withoutBranch}</Text><Text style={styles.statLabel}>Unassigned</Text></View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text>🔍 </Text>
          <TextInput style={styles.searchInput} placeholder="Search staff..." placeholderTextColor={Colors.textMuted} value={search} onChangeText={setSearch} />
          {search.length > 0 && <TouchableOpacity onPress={()=>setSearch('')}><Text style={{color:Colors.textMuted}}>✕</Text></TouchableOpacity>}
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
            ListEmptyComponent={<Text style={styles.empty}>No staff found.</Text>}
            renderItem={({ item }) => {
              const assignedOffice = offices.find(o => o.name === item.office);
              return (
                <View style={styles.row}>
                  <View style={[styles.avatar, { backgroundColor: item.office ? Colors.primary+'18' : Colors.warning+'20' }]}>
                    <Text style={[styles.avatarText, { color: item.office ? Colors.primary : Colors.warning }]}>
                      {item.full_name?.split(' ').map((n:string)=>n[0]).join('').slice(0,2)||'??'}
                    </Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name}>{item.full_name}</Text>
                    <View style={styles.branchRow}>
                      {item.office
                        ? <View style={styles.branchTag}><Text style={styles.branchTagText}>🏦 {item.office}</Text></View>
                        : <View style={styles.unassignedTag}><Text style={styles.unassignedTagText}>⚠️ Unassigned</Text></View>
                      }
                    </View>
                    <Text style={styles.role}>{item.role || 'Staff'}</Text>
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.assignBtn}
                      onPress={() => { setPickerStaff(item); setPickerOpen(true); }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.assignBtnText}>Assign</Text>
                    </TouchableOpacity>
                    {item.office && assignedOffice && (
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => removeAssignment({ staffId: item.id, officeId: assignedOffice.id })}
                      >
                        <Text style={styles.removeBtnText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}

      <OfficePickerModal
        visible={pickerOpen}
        onClose={() => { setPickerOpen(false); setPickerStaff(null); }}
        offices={offices}
        isLoading={loadingOffices}
        onSelect={handleAssign}
        title={`Assign Branch: ${pickerStaff?.full_name || ''}`}
      />
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
  searchInput: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.text },
  list: { paddingHorizontal: Spacing.base, gap: Spacing.sm, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontWeight: '700', fontSize: 13 },
  info: { flex: 1 },
  name: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.text, marginBottom: 3 },
  branchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  branchTag: { backgroundColor: Colors.primary+'12', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  branchTagText: { fontSize: 10, color: Colors.primary, fontWeight: Typography.weights.semibold },
  unassignedTag: { backgroundColor: Colors.warning+'15', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  unassignedTagText: { fontSize: 10, color: Colors.warning, fontWeight: Typography.weights.semibold },
  role: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 2 },
  actions: { gap: 4, alignItems: 'flex-end' },
  assignBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 6 },
  assignBtnText: { fontSize: 11, color: '#fff', fontWeight: Typography.weights.bold },
  removeBtn: { backgroundColor: Colors.errorLight, borderRadius: Radius.md, paddingHorizontal: 10, paddingVertical: 6 },
  removeBtnText: { fontSize: 11, color: Colors.error, fontWeight: Typography.weights.bold },
  empty: { textAlign: 'center', color: Colors.textMuted, padding: 40 },
});
