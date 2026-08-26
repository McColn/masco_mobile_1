// components/common/OfficePickerModal.tsx
// Reusable office/branch picker used by: Staff, Transfer, ManageBranches
import React from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
  FlatList, ActivityIndicator, Dimensions,
} from 'react-native';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import type { Office } from '@/lib/types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (office: Office) => void;
  offices: Office[];
  isLoading: boolean;
  selectedId?: number | string | null;
  excludeName?: string;   // optional: grey out this office (e.g. current branch)
  title?: string;
}

const { height: H } = Dimensions.get('window');

export function OfficePickerModal({
  visible, onClose, onSelect, offices, isLoading,
  selectedId, excludeName, title = 'Select Branch',
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        {/* Overlay */}
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />

        {/* Sheet */}
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Loading */}
          {isLoading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Colors.primary} size="large" />
              <Text style={styles.loadingText}>Loading branches...</Text>
            </View>
          )}

          {/* Empty */}
          {!isLoading && offices.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🏦</Text>
              <Text style={styles.emptyText}>No branches found.</Text>
              <Text style={styles.emptyHint}>Make sure the Django server is updated.</Text>
            </View>
          )}

          {/* List */}
          {!isLoading && offices.length > 0 && (
            <FlatList
              data={offices}
              keyExtractor={o => String(o.id)}
              bounces={false}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isCurrent  = item.name === excludeName;
                const isSelected = String(item.id) === String(selectedId);

                return (
                  <TouchableOpacity
                    style={[
                      styles.option,
                      isSelected && styles.optionSelected,
                      isCurrent && styles.optionDisabled,
                    ]}
                    onPress={() => {
                      if (!isCurrent) {
                        onSelect(item);
                        onClose();
                      }
                    }}
                    activeOpacity={isCurrent ? 1 : 0.7}
                  >
                    <View style={[
                      styles.iconCircle,
                      isSelected && { backgroundColor: Colors.primary + '20' },
                    ]}>
                      <Text style={styles.iconEmoji}>🏦</Text>
                    </View>

                    <View style={styles.optionInfo}>
                      <Text style={[
                        styles.optionName,
                        isSelected && { color: Colors.primary },
                        isCurrent && { color: Colors.textMuted },
                      ]}>
                        {item.name}
                      </Text>
                      {(item.district || item.region) && (
                        <Text style={styles.optionSub}>
                          {[item.district, item.region].filter(Boolean).join(', ')}
                        </Text>
                      )}
                      {isCurrent && (
                        <Text style={styles.currentLabel}>Current branch</Text>
                      )}
                    </View>

                    {isSelected
                      ? <Text style={styles.checkmark}>✓</Text>
                      : <View style={[styles.radio, isSelected && styles.radioSelected]}>
                          {isSelected && <View style={styles.radioDot} />}
                        </View>
                    }
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.overlay },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: H * 0.65,
    ...Shadow.lg,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.text },
  closeBtn: { fontSize: 18, color: Colors.textMuted, padding: 4 },

  loadingBox: { padding: 40, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: Typography.sizes.sm, color: Colors.textMuted },

  emptyBox: { padding: 40, alignItems: 'center', gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold, color: Colors.text },
  emptyHint: { fontSize: Typography.sizes.xs, color: Colors.textMuted, textAlign: 'center' },

  option: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.base, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  optionSelected: { backgroundColor: Colors.primary + '06' },
  optionDisabled: { opacity: 0.4 },
  iconCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  iconEmoji: { fontSize: 18 },
  optionInfo: { flex: 1 },
  optionName: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.text },
  optionSub: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 1 },
  currentLabel: { fontSize: 10, color: Colors.textMuted, fontStyle: 'italic', marginTop: 1 },
  checkmark: { color: Colors.primary, fontSize: 18, fontWeight: Typography.weights.bold },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
});
