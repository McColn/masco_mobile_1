import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { LoanCard } from '@/components/common/LoanCard';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { ClientService } from '@/lib/services';
import { QK } from '@/lib/queryClient';
import { formatDate } from '@/lib/format';

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const clientId = Number(id);
  const [activeTab, setActiveTab] = useState<'info' | 'loans' | 'guarantor'>('info');

  const { data: client, isLoading, refetch, isRefetching } = useQuery({
    queryKey: QK.client(clientId),
    queryFn: () => ClientService.get(clientId),
    enabled: !!clientId,
  });

  const { data: loans, isLoading: loansLoading } = useQuery({
    queryKey: QK.clientLoans(clientId),
    queryFn: () => ClientService.loans(clientId),
    enabled: activeTab === 'loans' && !!clientId,
  });

  if (isLoading) {
    return (
      <ScreenLayout title="Client Details" showBack>
        <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 60 }} />
      </ScreenLayout>
    );
  }

  if (!client) {
    return (
      <ScreenLayout title="Client Details" showBack>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Client not found.</Text>
        </View>
      </ScreenLayout>
    );
  }

  const initials = (client.full_name || `${client.firstname} ${client.lastname}`)
    .split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  const fullName = client.full_name || `${client.firstname || ''} ${client.lastname || ''}`.trim();

  const TABS = [
    { key: 'info',      label: 'Taarifa' },
    { key: 'loans',     label: 'Mikopo' },
    { key: 'guarantor', label: 'Mdhamini' },
  ] as const;

  const infoRows = [
    { label: 'Full Name',       value: fullName },
    { label: 'Phone',           value: client.phonenumber },
    { label: 'Date of Birth',   value: formatDate(client.date_of_birth) },
    { label: 'Marital Status',  value: client.marital_status },
    { label: 'Employer',        value: client.employername },
    { label: 'Department',      value: client.idara },
    { label: 'Job Title',       value: client.kaziyako },
    { label: 'ID / Check No',   value: client.checkno || client.employmentcardno },
    { label: 'Region',          value: client.region },
    { label: 'District',        value: client.district },
    { label: 'Street',          value: client.street },
    { label: 'Registered',      value: formatDate(client.registered_date) },
    { label: 'Office',          value: client.registered_office_name },
  ];

  const bankRows = [
    { label: 'Bank Name',       value: client.bank_name },
    { label: 'Bank Branch',     value: client.bank_branch },
    { label: 'Account Number',  value: client.bank_account_number },
    { label: 'Account Name',    value: client.account_name },
  ];

  const guarantorRows = [
    { label: 'Full Name',   value: client.mdhamini_name },
    { label: 'Phone',       value: client.mdhamini_phonenumber },
    { label: 'Employer',    value: client.mdhamini_employername },
    { label: 'ID / Check',  value: client.mdhamini_checkno },
  ];

  return (
    <ScreenLayout
      title="Client Details"
      showBack
      rightAction={
        <TouchableOpacity
          style={styles.newLoanBtn}
          onPress={() => router.push(`/loans/new?client_id=${clientId}&client_name=${encodeURIComponent(fullName)}` as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.newLoanBtnText}>+ Loan</Text>
        </TouchableOpacity>
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Hero card ── */}
        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.heroName}>{fullName}</Text>
          <Text style={styles.heroSub}>
            {client.registered_office_name || '—'} · Registered {formatDate(client.registered_date)}
          </Text>
          <Text style={styles.heroPhone}>{client.phonenumber || 'No phone'}</Text>
        </View>

        {/* ── Tabs ── */}
        <View style={styles.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, activeTab === t.key && styles.tabActive]}
              onPress={() => setActiveTab(t.key)}
            >
              <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.body}>

          {/* ── Info tab ── */}
          {activeTab === 'info' && (
            <>
              <InfoCard title="Personal Information" rows={infoRows} />
              <InfoCard title="Bank Information" rows={bankRows} />
            </>
          )}

          {/* ── Loans tab ── */}
          {activeTab === 'loans' && (
            <View>
              {loansLoading ? (
                <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
              ) : !loans || loans.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={{ fontSize: 36 }}>💰</Text>
                  <Text style={styles.emptyTitle}>No Loans Yet</Text>
                  <TouchableOpacity
                    style={styles.addLoanBtn}
                    onPress={() => router.push(`/loans/new?client_id=${clientId}&client_name=${encodeURIComponent(fullName)}` as any)}
                  >
                    <Text style={styles.addLoanBtnText}>+ New Loan</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {(loans as any[]).map((loan: any) => (
                    <LoanCard
                      key={loan.id}
                      loan={loan}
                      onPress={() => router.push(`/loans/${loan.id}` as any)}
                    />
                  ))}
                  <TouchableOpacity
                    style={styles.addLoanBtn}
                    onPress={() => router.push(`/loans/new?client_id=${clientId}&client_name=${encodeURIComponent(fullName)}` as any)}
                  >
                    <Text style={styles.addLoanBtnText}>+ New Loan for this Client</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* ── Guarantor tab ── */}
          {activeTab === 'guarantor' && (
            <InfoCard title="Guarantor (Mdhamini)" rows={guarantorRows} />
          )}

        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

// ── Reusable info card component ─────────────────────────────────────────────
function InfoCard({ title, rows }: { title: string; rows: { label: string; value?: string | null }[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {rows.map((r, i) => (
        <View key={r.label} style={[styles.row, i < rows.length - 1 && styles.rowBorder]}>
          <Text style={styles.rowLabel}>{r.label}</Text>
          <Text style={styles.rowValue}>{r.value || '—'}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Hero
  heroCard: {
    alignItems: 'center', padding: Spacing.xl,
    backgroundColor: Colors.primary, gap: 4,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '800' },
  heroName: { color: '#fff', fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  heroSub:  { color: 'rgba(255,255,255,0.75)', fontSize: Typography.sizes.xs, textAlign: 'center' },
  heroPhone:{ color: 'rgba(255,255,255,0.9)', fontSize: Typography.sizes.sm },

  // New loan button in header
  newLoanBtn: {
    backgroundColor: Colors.accent, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  newLoanBtnText: { color: '#fff', fontSize: 11, fontWeight: Typography.weights.bold },

  // Tabs
  tabBar: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1, paddingVertical: 13, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: Typography.sizes.sm, color: Colors.textMuted, fontWeight: Typography.weights.medium },
  tabTextActive: { color: Colors.primary, fontWeight: Typography.weights.bold },

  // Body
  body: { padding: Spacing.base, gap: Spacing.md },

  // Info card
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    ...Shadow.sm, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: Typography.sizes.xs, fontWeight: Typography.weights.bold,
    color: Colors.primary, padding: Spacing.md,
    backgroundColor: Colors.primary + '08',
    textTransform: 'uppercase', letterSpacing: 0.6,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 11,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel: { fontSize: Typography.sizes.sm, color: Colors.textMuted, flex: 1 },
  rowValue: {
    fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium,
    color: Colors.text, flex: 1.2, textAlign: 'right',
  },

  // Empty state
  emptyBox: { alignItems: 'center', paddingTop: 40, gap: Spacing.sm },
  emptyTitle: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.text },
  emptyText: { fontSize: Typography.sizes.sm, color: Colors.textMuted },

  // Add loan button
  addLoanBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 12, alignItems: 'center', marginTop: Spacing.sm,
  },
  addLoanBtnText: { color: '#fff', fontWeight: Typography.weights.bold, fontSize: Typography.sizes.sm },
});
