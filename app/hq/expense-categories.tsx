// Fix 3: Expense Categories — lists all categories + Add/Edit/Delete
import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, RefreshControl,
  Dimensions, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { ExpenseService } from '@/lib/services';
import api from '@/lib/api';

const { height: H } = Dimensions.get('window');

function CategoryModal({ visible, onClose, onSuccess, editItem }: any) {
  const [name, setName] = useState(editItem?.name || '');
  const isEdit = !!editItem;
  React.useEffect(() => { setName(editItem?.name || ''); }, [editItem]);

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      isEdit
        ? api.patch(`/expense-categories/${editItem.id}/`, { name })
        : api.post('/expense-categories/add/', { name }),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: isEdit ? 'Category Updated' : 'Category Added', text2: name });
      onSuccess(); onClose(); setName('');
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: 'Error', text2: e?.response?.data?.detail || 'Operation failed.' }),
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{isEdit ? 'Edit Category' : 'Add Expense Category'}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sheetBody}>
            <Text style={styles.fieldLabel}>Category Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Office Supplies, Fuel, Rent..."
              placeholderTextColor={Colors.textMuted}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => name.trim() && mutate()}
            />
            <TouchableOpacity
              style={[styles.submitBtn, (!name.trim() || isPending) && { opacity: 0.6 }]}
              onPress={() => name.trim() && mutate()}
              disabled={!name.trim() || isPending}
            >
              <Text style={styles.submitText}>
                {isPending ? 'Saving...' : isEdit ? '✓  Update Category' : '✓  Add Category'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ExpenseCategoriesScreen() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['expense-categories-list'],
    queryFn: ExpenseService.categories,
  });

  const { mutate: deleteCategory } = useMutation({
    mutationFn: (id: number) => api.delete(`/expense-categories/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expense-categories-list'] }); Toast.show({ type: 'success', text1: 'Category Deleted' }); },
    onError: () => Toast.show({ type: 'error', text1: 'Delete failed' }),
  });

  const confirmDelete = (item: any) => {
    Alert.alert('Delete Category', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteCategory(item.id) },
    ]);
  };

  const categories: any[] = Array.isArray(data) ? data : [];

  return (
    <ScreenLayout
      title="Expense Categories"
      subtitle={`${categories.length} categories`}
      showBack
      rightAction={
        <TouchableOpacity style={styles.addBtn} onPress={() => { setEditItem(null); setModalOpen(true); }}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      }
    >
      {/* Stats */}
      {categories.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{categories.length}</Text>
            <Text style={styles.statLabel}>Total Categories</Text>
          </View>
        </View>
      )}

      {isLoading
        ? <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
        : (
          <FlatList
            data={categories}
            keyExtractor={i => String(i.id)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={{ fontSize: 40 }}>🏷️</Text>
                <Text style={styles.emptyTitle}>No Categories Yet</Text>
                <Text style={styles.emptyText}>Tap + to add the first expense category.</Text>
              </View>
            }
            renderItem={({ item, index }) => (
              <View style={styles.row}>
                <View style={styles.indexBadge}>
                  <Text style={styles.indexText}>{index + 1}</Text>
                </View>
                <View style={styles.iconCircle}>
                  <Text style={{ fontSize: 18 }}>🏷️</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.created_at && <Text style={styles.meta}>Added {item.created_at?.slice(0,10)}</Text>}
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => { setEditItem(item); setModalOpen(true); }}
                  >
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.delBtn} onPress={() => confirmDelete(item)}>
                    <Text style={styles.delBtnText}>Del</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}

      <CategoryModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        editItem={editItem}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['expense-categories-list'] })}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 22, lineHeight: 26 },
  statsRow: { paddingHorizontal: Spacing.base, paddingTop: Spacing.base, paddingBottom: Spacing.sm },
  statCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  statValue: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.primary },
  statLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 2 },
  list: { padding: Spacing.base, gap: Spacing.sm, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, ...Shadow.sm, borderWidth: 1, borderColor: Colors.border },
  indexBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary+'15', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  indexText: { fontSize: 10, color: Colors.primary, fontWeight: Typography.weights.bold },
  iconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.accent+'15', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  info: { flex: 1 },
  name: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.text },
  meta: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: Spacing.xs },
  editBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.md, backgroundColor: Colors.primary+'15', borderWidth: 1, borderColor: Colors.primary+'30' },
  editBtnText: { fontSize: 11, color: Colors.primary, fontWeight: Typography.weights.semibold },
  delBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.md, backgroundColor: Colors.errorLight, borderWidth: 1, borderColor: Colors.error+'30' },
  delBtnText: { fontSize: 11, color: Colors.error, fontWeight: Typography.weights.semibold },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm },
  emptyTitle: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.text },
  emptyText: { fontSize: Typography.sizes.sm, color: Colors.textMuted },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.overlay },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sheetTitle: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.text },
  closeBtn: { fontSize: 18, color: Colors.textMuted, padding: 4 },
  sheetBody: { padding: Spacing.base, paddingBottom: 40 },
  fieldLabel: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, color: Colors.textSecondary, marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 12, fontSize: Typography.sizes.base, color: Colors.text, backgroundColor: Colors.surfaceAlt },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.md },
  submitText: { color: '#fff', fontWeight: Typography.weights.bold, fontSize: Typography.sizes.base },
});
