// Transfer Client (HQ) — mirrors transfer_client() / process_transfer_client()
// web views. Select a client → their Check No + Current Branch auto-fill →
// pick a New Branch → Submit. On success the client AND all their loans move
// to the new office.
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, FlatList, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { useDebounce } from '@/hooks/useDebounce';
import { ClientService } from '@/lib/services';

const GOLD = '#c8a96e';
const TEAL = '#16a34a';
const NAVY = '#0d1b2e';

// ── Client picker bottom-sheet ──────────────────────────────────────────
function ClientPicker({
  visible, clients, onClose, onSelect,
}: { visible: boolean; clients: any[]; onClose: () => void; onSelect: (c: any) => void }) {
  const [q, setQ] = useState('');
  const filtered = q.trim()
    ? clients.filter(c =>
        c.display_label.toLowerCase().includes(q.toLowerCase()) ||
        String(c.check_no).toLowerCase().includes(q.toLowerCase()))
    : clients;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ps.root}>
        <TouchableOpacity style={ps.overlay} activeOpacity={1} onPress={onClose} />
        <View style={ps.sheet}>
          <View style={ps.header}>
            <Text style={ps.title}>Select Client</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 18, color: Colors.textMuted }}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
            <TextInput
              style={ps.search}
              placeholder="Search by name or check no…"
              value={q} onChangeText={setQ}
              placeholderTextColor={Colors.textMuted} autoCapitalize="none"
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={c => String(c.client_id)}
            renderItem={({ item }) => (
              <TouchableOpacity style={ps.row} onPress={() => { onSelect(item); onClose(); }}>
                <Text style={ps.rowName} numberOfLines={1}>{item.display_label}</Text>
                <Text style={ps.rowMeta}>Current: {item.current_branch}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={{ color: Colors.textMuted, textAlign: 'center', padding: 40 }}>
                {q ? `No matches for "${q}"` : 'No clients found.'}
              </Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

// ── New Branch picker ───────────────────────────────────────────────────
function BranchPicker({
  visible, offices, onClose, onSelect,
}: { visible: boolean; offices: any[]; onClose: () => void; onSelect: (o: any) => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ps.root}>
        <TouchableOpacity style={ps.overlay} activeOpacity={1} onPress={onClose} />
        <View style={ps.sheet}>
          <View style={ps.header}>
            <Text style={ps.title}>Select New Branch</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 18, color: Colors.textMuted }}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={offices}
            keyExtractor={o => String(o.id)}
            renderItem={({ item }) => (
              <TouchableOpacity style={ps.row} onPress={() => { onSelect(item); onClose(); }}>
                <Text style={ps.rowName}>{item.name}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={{ color: Colors.textMuted, textAlign: 'center', padding: 40 }}>No offices found.</Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

export default function TransferClientScreen() {
  const qc = useQueryClient();
  const [client, setClient]         = useState<any>(null);
  const [newBranch, setNewBranch]   = useState<any>(null);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['transfer-client-data'],
    queryFn:  () => ClientService.transferData(),
  });

  const clients: any[] = data?.clients ?? [];
  const offices: any[] = data?.offices ?? [];

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () => ClientService.processTransfer({
      client_id:     client.client_id,
      new_office_id: newBranch.id,
    }),
    onSuccess: (res: any) => {
      Toast.show({
        type: 'success',
        text1: '✓ Client transferred',
        text2: res?.message ?? `Moved to ${newBranch.name}.`,
        visibilityTime: 5000,
      });
      // Reset form + refresh data so current-branch reflects the move
      setClient(null);
      setNewBranch(null);
      qc.invalidateQueries({ queryKey: ['transfer-client-data'] });
      qc.invalidateQueries({ queryKey: ['customer-report'] });
      qc.invalidateQueries({ queryKey: ['customer-loans-branch'] });
    },
    onError: (e: any) => {
      Toast.show({
        type: 'error',
        text1: 'Transfer failed',
        text2: e?.response?.data?.error ?? e?.response?.data?.detail ?? 'Please try again.',
        visibilityTime: 6000,
      });
    },
  });

  const handleSubmit = () => {
    if (!client)    { Alert.alert('Select a client', 'Please choose a client to transfer.'); return; }
    if (!newBranch) { Alert.alert('Select new branch', 'Please choose the destination branch.'); return; }
    if (newBranch.name === client.current_branch) {
      Alert.alert('Same branch', 'The client is already in this branch. Pick a different one.');
      return;
    }
    Alert.alert(
      'Confirm Transfer',
      `Move ${client.client_name} and all their loans\n\nfrom ${client.current_branch}\nto ${newBranch.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Transfer', style: 'default', onPress: () => submit() },
      ]
    );
  };

  return (
    <ScreenLayout title="Transfer Client" showBack>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
        ) : (
          <View style={s.card}>
            {/* Client Name */}
            <Text style={s.label}>Client Name *</Text>
            <TouchableOpacity style={s.selectBox} onPress={() => setClientPickerOpen(true)}>
              <Text style={[s.selectText, !client && { color: Colors.textMuted }]} numberOfLines={1}>
                {client?.display_label ?? 'Andika jina la client…'}
              </Text>
              <Text style={s.chevron}>▼</Text>
            </TouchableOpacity>

            {/* Check No (auto-filled, read-only) */}
            <Text style={[s.label, { marginTop: 18 }]}>Check No</Text>
            <View style={[s.selectBox, s.readonly]}>
              <Text style={[s.selectText, !client && { color: Colors.textMuted }]}>
                {client?.check_no || 'Auto-filled'}
              </Text>
            </View>

            {/* Current Branch (auto-filled, read-only) */}
            <Text style={[s.label, { marginTop: 18 }]}>Current Branch</Text>
            <View style={[s.selectBox, s.readonly]}>
              <Text style={[s.selectText, !client && { color: Colors.textMuted }]}>
                {client?.current_branch || 'Auto-filled'}
              </Text>
            </View>

            <View style={s.divider} />

            {/* New Branch */}
            <Text style={s.label}>New Branch *</Text>
            <TouchableOpacity style={s.selectBox} onPress={() => setBranchPickerOpen(true)}>
              <Text style={[s.selectText, !newBranch && { color: Colors.textMuted }]}>
                {newBranch?.name ?? 'Select New Branch'}
              </Text>
              <Text style={s.chevron}>▼</Text>
            </TouchableOpacity>

            {/* Submit */}
            <TouchableOpacity
              style={[s.submitBtn, isPending && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={isPending}
            >
              {isPending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.submitText}>SUBMIT</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <ClientPicker
        visible={clientPickerOpen}
        clients={clients}
        onClose={() => setClientPickerOpen(false)}
        onSelect={c => { setClient(c); setNewBranch(null); }}
      />
      <BranchPicker
        visible={branchPickerOpen}
        offices={offices}
        onClose={() => setBranchPickerOpen(false)}
        onSelect={o => setNewBranch(o)}
      />
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, margin: Spacing.base,
    borderRadius: Radius.md, padding: Spacing.base, ...Shadow.sm,
  },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6 },
  selectBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff',
  },
  readonly: { backgroundColor: '#f1f5f9' },
  selectText: { flex: 1, fontSize: 14, color: Colors.text },
  chevron: { fontSize: 12, color: Colors.textMuted, marginLeft: 8 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 20 },
  submitBtn: {
    backgroundColor: TEAL, borderRadius: Radius.md, paddingVertical: 14,
    alignItems: 'center', marginTop: 24, ...Shadow.sm,
  },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 1 },
});

const ps = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { fontSize: 15, fontWeight: '700', color: Colors.text },
  search: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: Colors.text, backgroundColor: '#fff',
  },
  row: { padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowName: { fontSize: 13, fontWeight: '600', color: Colors.text },
  rowMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
});
