import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore } from '@/store/branchStore';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { selectedBranch } = useBranchStore();

  const initials = user?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  const confirmLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScreenLayout title="Profile" showBack>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.fullName}>{user?.full_name || 'User'}</Text>
          <Text style={styles.username}>@{user?.username}</Text>
          <View style={[styles.badge, { backgroundColor: Colors.primary + '18' }]}>
            <Text style={[styles.badgeText, { color: Colors.primary }]}>
              {user?.is_superuser ? 'Superuser' : user?.role || 'Staff'}
            </Text>
          </View>
        </View>

        {/* User info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Information</Text>
          <InfoRow label="Full Name"  value={user?.full_name || ''} />
          <InfoRow label="Username"   value={user?.username || ''} />
          <InfoRow label="Email"      value={user?.email || ''} />
          <InfoRow label="Phone"      value={user?.phone || ''} />
          <InfoRow label="Employee ID" value={user?.employee_id || ''} />
          <InfoRow label="Branch"     value={selectedBranch?.name || user?.office || ''} />
          <InfoRow label="Role"       value={user?.role || ''} />
        </View>

        {/* Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Settings</Text>
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/(tabs)/')}>
            <Text style={styles.menuRowIcon}>🏠</Text>
            <Text style={styles.menuRowLabel}>Dashboard</Text>
            <Text style={styles.menuRowArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/reports/index' as any)}>
            <Text style={styles.menuRowIcon}>📊</Text>
            <Text style={styles.menuRowLabel}>Reports</Text>
            <Text style={styles.menuRowArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
          <Text style={styles.logoutText}>🚪 Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.base, paddingBottom: 48 },
  avatarCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.md, ...Shadow.sm,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  fullName: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.text },
  username: { fontSize: Typography.sizes.sm, color: Colors.textMuted, marginTop: 2 },
  badge: {
    marginTop: 8, paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: Radius.full,
  },
  badgeText: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.base, marginBottom: Spacing.md, ...Shadow.sm,
  },
  cardTitle: {
    fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold,
    color: Colors.primary, marginBottom: Spacing.sm,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  infoLabel: { fontSize: Typography.sizes.sm, color: Colors.textMuted },
  infoValue: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium, color: Colors.text, maxWidth: '60%', textAlign: 'right' },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12,
  },
  menuRowIcon: { fontSize: 16, width: 24, textAlign: 'center' },
  menuRowLabel: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.text },
  menuRowArrow: { fontSize: 18, color: Colors.textMuted },
  logoutBtn: {
    backgroundColor: Colors.error + '12', borderRadius: Radius.lg,
    padding: Spacing.base, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.error + '30',
  },
  logoutText: { color: Colors.error, fontWeight: Typography.weights.semibold, fontSize: Typography.sizes.base },
});
