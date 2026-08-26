// BranchSelector — HQ user can switch between branches
// Switching clears all query cache so every screen refetches fresh data
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
  FlatList, Dimensions, ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore, selectIsHQUser } from '@/store/branchStore';
import { useQueryClient } from '@tanstack/react-query';

export function BranchSelectorButton() {
  const { user } = useAuthStore();
  const { selectedBranch, branches, switchBranch, switchToHQ, viewingHQ, isLoading } = useBranchStore();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const isHQUser = selectIsHQUser(user?.is_superuser ?? false, branches.length);
  if (!isHQUser) return null;

  // Invalidate all queries so they refetch in background
  // Using invalidateQueries instead of clear() so screens show stale data
  // instantly while fresh data loads — no blank loading screens
  const clearAllCache = () => {
    queryClient.invalidateQueries();
  };

  const handleSelect = (item: any) => {
    if (item.__hq) {
      switchToHQ(clearAllCache);
    } else {
      switchBranch(item, clearAllCache);
    }
    setOpen(false);
  };

  const handleOpen = () => {
    if (branches.length === 0) useBranchStore.getState().loadBranches();
    setOpen(true);
  };

  // Build display label
  const displayLabel = viewingHQ
    ? 'HQ View'
    : selectedBranch?.name ?? 'Select Branch';

  // Build list: regular branches + HQ option at top
  const branchBranches = branches.filter(b => b.name?.toUpperCase() !== 'HQ');
  const hqBranch       = branches.find(b => b.name?.toUpperCase() === 'HQ');
  const listItems: any[] = [
    // HQ option always at top
    {
      __hq: true,
      id: -1,
      name: '🏢 HQ View',
      district: 'View all branches combined',
      region: '',
    },
    ...branchBranches,
  ];

  return (
    <>
      <TouchableOpacity style={styles.pill} onPress={handleOpen} activeOpacity={0.8}>
        <Text style={styles.pillIcon}>{viewingHQ ? '🏢' : '🏦'}</Text>
        <Text style={styles.pillText} numberOfLines={1}>{displayLabel}</Text>
        <Text style={styles.pillArrow}>▾</Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalRoot}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Switch View</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.hint}>
              Select a branch to view its data and menus, or HQ View for combined data.
            </Text>

            {isLoading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.loadingText}>Loading branches...</Text>
              </View>
            )}

            {!isLoading && (
              <FlatList
                data={listItems}
                keyExtractor={b => String(b.id)}
                bounces={false}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isHQOption = item.__hq;
                  const isActive   = isHQOption ? viewingHQ : (item.id === selectedBranch?.id && !viewingHQ);

                  return (
                    <TouchableOpacity
                      style={[styles.option, isActive && styles.optionActive]}
                      onPress={() => handleSelect(item)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.optionIcon,
                        isActive && { backgroundColor: Colors.primary + '20' },
                        isHQOption && { backgroundColor: Colors.accent + '20' },
                      ]}>
                        <Text style={{ fontSize: 18 }}>{isHQOption ? '🏢' : '🏦'}</Text>
                      </View>
                      <View style={styles.optionInfo}>
                        <Text style={[
                          styles.optionName,
                          isActive && { color: Colors.primary },
                          isHQOption && { color: Colors.accent },
                        ]}>
                          {isHQOption ? 'HQ View' : item.name}
                        </Text>
                        <Text style={styles.optionSub}>
                          {item.district
                            ? `${item.district}, ${item.region}`
                            : isHQOption
                              ? 'All branches combined data'
                              : ''}
                        </Text>
                      </View>
                      {isActive && <Text style={[styles.checkmark, isHQOption && { color: Colors.accent }]}>✓</Text>}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const { height: H } = Dimensions.get('window');
const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5,
    maxWidth: 160,
  },
  pillIcon: { fontSize: 12 },
  pillText: { flex: 1, color: '#fff', fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold },
  pillArrow: { color: '#fff', fontSize: 10 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.overlay },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: H * 0.65, ...Shadow.lg,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  sheetTitle: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.text },
  closeBtn: { fontSize: 18, color: Colors.textMuted, padding: 4 },
  hint: {
    fontSize: Typography.sizes.xs, color: Colors.textMuted,
    paddingHorizontal: Spacing.base, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  loadingBox: { padding: 40, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: Typography.sizes.sm, color: Colors.textMuted },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.base, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  optionActive: { backgroundColor: Colors.primary + '06' },
  optionIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  optionInfo: { flex: 1 },
  optionName: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.text },
  optionSub: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 1 },
  checkmark: { color: Colors.primary, fontSize: 18, fontWeight: Typography.weights.bold },
});
