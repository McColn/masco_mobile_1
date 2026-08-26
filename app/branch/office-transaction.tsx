// Branch Office Transaction screen
// Transaction types (from images):
//   Transfer    → OfficeTransaction (branch to branch/HQ)
//   Expenses    → Expense record (with category + attachment)
//   Bank Charges→ BankCharge record (with attachment)
// No "Deposit" option (removed per instructions)

import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, Dimensions, Alert,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore } from '@/store/branchStore';
import { useOffices } from '@/hooks/useOffices';
import { OfficePickerModal } from '@/components/common/OfficePickerModal';
import { formatTZS, getTodayLocal } from '@/lib/format';
import api from '@/lib/api';
import type { Office } from '@/lib/types';
import { DateInput } from '@/components/ui/DateInput';

const { height: H } = Dimensions.get('window');
const TEAL = '#0da9a9';
const TODAY = getTodayLocal();

type TxType = 'Transfer' | 'Expenses' | 'Bank Charges' | '';

// ── Chip selector ─────────────────────────────────────────────────────────
function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.chip, active && s.chipActive]} onPress={onPress}>
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Form row ──────────────────────────────────────────────────────────────
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

// ── Transfer sub-form ─────────────────────────────────────────────────────
function TransferForm({ officeFrom, onSuccess }: { officeFrom: Office | null; onSuccess: () => void }) {
  const { offices } = useOffices();
  const [officeTo,     setOfficeTo]     = useState<Office | null>(null);
  const [toPickerOpen, setToPickerOpen] = useState(false);
  const [amount,       setAmount]       = useState('');
  const [txMethod,     setTxMethod]     = useState('cash');
  const [txDate,       setTxDate]       = useState(TODAY);
  const qc = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      if (!officeFrom) throw new Error('No branch selected.');
      if (!officeTo)   throw new Error('Select destination office.');
      if (!amount)     throw new Error('Enter amount.');
      return api.post('/office-transactions/add/', {
        office_from_id:     officeFrom.id,
        office_to_id:       officeTo.id,
        amount:             amount.replace(/,/g, ''),
        transaction_method: txMethod,
        transaction_date:   txDate,
        transaction_type:   'Transfer',
      }).then(r => r.data);
    },
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Transfer Added' });
      setAmount(''); setOfficeTo(null);
      qc.invalidateQueries({ queryKey: ['office-transactions'] });
      onSuccess();
    },
    onError: (e: any) => {
      const d   = e?.response?.data;
      const msg = d?.detail ?? d?.error
        ?? (typeof d === 'object' ? JSON.stringify(d) : null)
        ?? e?.message ?? 'Failed.';
      console.error('[TRANSFER]', e?.response?.status, JSON.stringify(d));
      Toast.show({ type: 'error', text1: 'Transfer Error', text2: msg, visibilityTime: 6000 });
    },
  });

  return (
    <View style={s.subForm}>
      <Row label="Office">
        <View style={[s.input, s.readOnly]}>
          <Text style={s.readOnlyText}>{officeFrom?.name ?? '—'}</Text>
        </View>
      </Row>

      <Row label="Transfer To">
        <TouchableOpacity style={s.pickerBtn} onPress={() => setToPickerOpen(true)}>
          <Text style={officeTo ? s.pickerText : s.pickerPlaceholder}>
            {officeTo?.name ?? 'Select destination...'}
          </Text>
          <Text style={s.pickerArrow}>▼</Text>
        </TouchableOpacity>
      </Row>

      <Row label="Amount">
        <View style={s.amountWrap}>
          <TextInput style={s.inputFlex} value={amount} onChangeText={setAmount}
            keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.textMuted} />
          <Text style={s.suffix}>/=</Text>
        </View>
      </Row>

      <Row label="Method">
        <View style={s.chipRow}>
          {[{v:'cash',l:'Cash'},{v:'bank',l:'Bank'}].map(m => (
            <Chip key={m.v} label={m.l} active={txMethod===m.v} onPress={() => setTxMethod(m.v)} />
          ))}
        </View>
      </Row>

      <Row label="Date">
        <DateInput value={txDate} onChange={setTxDate} style={s.input} />
      </Row>

      <SubmitBtn isPending={isPending} onPress={() => mutate()} label="Submit Transfer" />

      <OfficePickerModal visible={toPickerOpen} offices={offices}
        onSelect={o => { setOfficeTo(o); setToPickerOpen(false); }}
        onClose={() => setToPickerOpen(false)} title="Select Destination" />
    </View>
  );
}

// ── Expenses sub-form ─────────────────────────────────────────────────────
function ExpensesForm({ officeFrom, onSuccess }: { officeFrom: Office | null; onSuccess: () => void }) {
  const qc = useQueryClient();
  const [category,   setCategory]   = useState<{ id: number; name: string } | null>(null);
  const [catOpen,    setCatOpen]     = useState(false);
  const [description,setDescription]= useState('');
  const [amount,     setAmount]      = useState('');
  const [txMethod,   setTxMethod]    = useState('cash');
  const [txDate,     setTxDate]      = useState(TODAY);

  const { data: cats } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => api.get('/expense-categories/').then(r =>
      Array.isArray(r.data) ? r.data : (r.data.results ?? [])),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      if (!category) throw new Error('Select expense category.');
      if (!amount)   throw new Error('Enter amount.');
      return api.post('/expenses/', {
        transaction_type: Number(category.id),
        description,
        amount:           amount.replace(/,/g, ''),
        payment_method:   txMethod,
        transaction_date: txDate,
      }).then(r => r.data);
    },
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Expense Added' });
      setAmount(''); setDescription(''); setCategory(null);
      qc.invalidateQueries({ queryKey: ['expenses'] });
      onSuccess();
    },
    onError: (e: any) => {
      const d = e?.response?.data;
      const msg = d?.detail ?? d?.transaction_type?.[0]
        ?? (typeof d === 'object' ? JSON.stringify(d) : null)
        ?? e?.message ?? 'Failed.';
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
    },
  });

  return (
    <View style={s.subForm}>
      <Row label="Expense Category">
        <TouchableOpacity style={s.pickerBtn} onPress={() => setCatOpen(true)}>
          <Text style={category ? s.pickerText : s.pickerPlaceholder}>
            {category?.name ?? 'Select Expenses Account...'}
          </Text>
          <Text style={s.pickerArrow}>▼</Text>
        </TouchableOpacity>
      </Row>

      <Row label="Description">
        <TextInput style={[s.input, { height: 72, textAlignVertical: 'top' }]}
          value={description} onChangeText={setDescription}
          multiline placeholder="Description..." placeholderTextColor={Colors.textMuted} />
      </Row>

      <Row label="Amount">
        <View style={s.amountWrap}>
          <TextInput style={s.inputFlex} value={amount} onChangeText={setAmount}
            keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.textMuted} />
          <Text style={s.suffix}>/=</Text>
        </View>
      </Row>

      <Row label="Payment Method">
        <View style={s.chipRow}>
          {[{v:'cash',l:'Cash'},{v:'bank',l:'Bank'}].map(m => (
            <Chip key={m.v} label={m.l} active={txMethod===m.v} onPress={() => setTxMethod(m.v)} />
          ))}
        </View>
      </Row>

      <Row label="Transaction Date">
        <DateInput value={txDate} onChange={setTxDate} style={s.input} />
      </Row>

      <Row label="Office">
        <View style={[s.input, s.readOnly]}>
          <Text style={s.readOnlyText}>{officeFrom?.name ?? '—'}</Text>
        </View>
      </Row>

      <SubmitBtn isPending={isPending} onPress={() => mutate()} label="SUBMIT" />

      {/* Category picker modal */}
      <Modal visible={catOpen} transparent animationType="slide" onRequestClose={() => setCatOpen(false)}>
        <View style={s.modalRoot}>
          <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setCatOpen(false)} />
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Select Expenses Account</Text>
              <TouchableOpacity onPress={() => setCatOpen(false)}>
                <Text style={s.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {(cats ?? []).map((c: any) => (
                <TouchableOpacity key={c.id} style={s.sheetItem}
                  onPress={() => { setCategory({ id: c.id, name: c.name }); setCatOpen(false); }}>
                  <Text style={s.sheetItemText}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Bank Charges sub-form ─────────────────────────────────────────────────
function BankChargesForm({ officeFrom, onSuccess }: { officeFrom: Office | null; onSuccess: () => void }) {
  const qc = useQueryClient();
  const [description, setDescription] = useState('');
  const [amount,      setAmount]       = useState('');
  const [txMethod,    setTxMethod]     = useState('bank');
  const [txDate,      setTxDate]       = useState(TODAY);

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      if (!amount) throw new Error('Enter amount.');
      return api.post('/bank-charges/add/', {
        description,
        amount:           amount.replace(/,/g, ''),
        payment_method:   txMethod,
        transaction_date: txDate,
      }).then(r => r.data);
    },
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Bank Charge Added' });
      setAmount(''); setDescription('');
      qc.invalidateQueries({ queryKey: ['bank-charges'] });
      onSuccess();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.detail ?? e?.message ?? 'Failed.';
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
    },
  });

  return (
    <View style={s.subForm}>
      <Row label="Description">
        <TextInput style={[s.input, { height: 72, textAlignVertical: 'top' }]}
          value={description} onChangeText={setDescription}
          multiline placeholder="Description..." placeholderTextColor={Colors.textMuted} />
      </Row>

      <Row label="Amount">
        <View style={s.amountWrap}>
          <TextInput style={s.inputFlex} value={amount} onChangeText={setAmount}
            keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.textMuted} />
          <Text style={s.suffix}>/=</Text>
        </View>
      </Row>

      <Row label="Payment Method">
        <View style={s.chipRow}>
          {[{v:'cash',l:'Cash'},{v:'bank',l:'Bank'}].map(m => (
            <Chip key={m.v} label={m.l} active={txMethod===m.v} onPress={() => setTxMethod(m.v)} />
          ))}
        </View>
      </Row>

      <Row label="Transaction Date">
        <DateInput value={txDate} onChange={setTxDate} style={s.input} />
      </Row>

      <Row label="Office">
        <View style={[s.input, s.readOnly]}>
          <Text style={s.readOnlyText}>{officeFrom?.name ?? '—'}</Text>
        </View>
      </Row>

      <SubmitBtn isPending={isPending} onPress={() => mutate()} label="SUBMIT" />
    </View>
  );
}

// ── Submit button ─────────────────────────────────────────────────────────
function SubmitBtn({ isPending, onPress, label }: any) {
  return (
    <TouchableOpacity style={[s.submitBtn, isPending && { opacity: 0.7 }]}
      onPress={onPress} disabled={isPending}>
      {isPending
        ? <ActivityIndicator color="#fff" />
        : <Text style={s.submitText}>✓  {label}</Text>
      }
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────
export default function OfficeTransactionScreen() {
  const { user }          = useAuthStore();
  const { selectedBranch } = useBranchStore();
  const { offices }       = useOffices();
  const [txType, setTxType] = useState<TxType>('');
  const [done,   setDone]   = useState(0);  // increment to reset sub-form

  const officeFrom: Office | null = useMemo(() => {
    if (selectedBranch?.id && selectedBranch?.name) return selectedBranch;
    if (user?.office_id && user?.office)
      return { id: user.office_id, name: user.office, region: '', district: '' } as Office;
    if (user?.office && offices.length) {
      const m = offices.find(o => o.name === user!.office);
      if (m) return m;
    }
    return null;
  }, [selectedBranch, user, offices]);

  const TX_TYPES: TxType[] = ['Transfer', 'Expenses', 'Bank Charges'];

  return (
    <ScreenLayout title="Branch Office Transaction" showBack>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 }}>

        <View style={s.card}>
          <Text style={s.cardTitle}>BRANCH OFFICE TRANSACTION</Text>
          <View style={s.titleDivider} />

          {/* Transaction type selector */}
          <Row label="Transaction type">
            <View style={s.typeChips}>
              {TX_TYPES.map(t => (
                <TouchableOpacity key={t}
                  style={[s.typeChip, txType === t && s.typeChipActive]}
                  onPress={() => { setTxType(t); setDone(0); }}>
                  <Text style={[s.typeChipText, txType === t && s.typeChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Row>

          {/* Dynamic sub-form based on type */}
          {txType === '' && (
            <View style={s.placeholder}>
              <Text style={s.placeholderText}>Select a transaction type above to continue</Text>
            </View>
          )}

          {txType === 'Transfer' && (
            <TransferForm key={`transfer-${done}`} officeFrom={officeFrom}
              onSuccess={() => setDone(d => d+1)} />
          )}

          {txType === 'Expenses' && (
            <ExpensesForm key={`expense-${done}`} officeFrom={officeFrom}
              onSuccess={() => setDone(d => d+1)} />
          )}

          {txType === 'Bank Charges' && (
            <BankChargesForm key={`bankcharge-${done}`} officeFrom={officeFrom}
              onSuccess={() => setDone(d => d+1)} />
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff', margin: Spacing.base,
    borderWidth: 1, borderColor: '#ddd', ...Shadow.sm,
  },
  cardTitle: {
    fontSize: 15, fontWeight: '700', color: '#1a1a1a',
    padding: Spacing.base, paddingBottom: Spacing.sm,
    letterSpacing: 0.4,
  },
  titleDivider: { height: 1, backgroundColor: '#e0e0e0', marginHorizontal: Spacing.base, marginBottom: Spacing.sm },

  // Transaction type chips (large, prominent)
  typeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 2, borderWidth: 1, borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
  },
  typeChipActive: { backgroundColor: TEAL, borderColor: TEAL },
  typeChipText: { fontSize: 13, color: '#333' },
  typeChipTextActive: { color: '#fff', fontWeight: '600' },

  // Sub-form
  subForm: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.sm, gap: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 8,
  },
  rowLabel: { width: 130, fontSize: 13, color: '#333', flexShrink: 0 },

  // Inputs
  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 2,
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#1a1a1a',
    backgroundColor: '#fff',
  },
  readOnly: { backgroundColor: '#f0f0f0' },
  readOnlyText: { fontSize: 13, color: '#555' },
  amountWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#ccc', borderRadius: 2, overflow: 'hidden',
    backgroundColor: '#fff',
  },
  inputFlex: { flex: 1, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: '#1a1a1a' },
  suffix: { paddingHorizontal: 8, color: '#888', borderLeftWidth: 1, borderLeftColor: '#ccc', fontSize: 11, paddingVertical: 10 },

  // Chips (method)
  chipRow: { flexDirection: 'row', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 2, borderWidth: 1, borderColor: '#ccc', backgroundColor: '#f5f5f5' },
  chipActive: { backgroundColor: TEAL, borderColor: TEAL },
  chipText: { fontSize: 12, color: '#333' },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  // Picker
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#ccc', borderRadius: 2,
    paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#fff',
  },
  pickerText: { fontSize: 13, color: '#1a1a1a', flex: 1 },
  pickerPlaceholder: { fontSize: 13, color: Colors.textMuted, flex: 1 },
  pickerArrow: { fontSize: 10, color: Colors.textMuted },

  // Submit
  submitBtn: {
    backgroundColor: TEAL, borderRadius: 2,
    paddingVertical: 13, alignItems: 'center',
    marginTop: Spacing.base, marginBottom: Spacing.sm,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },

  // Modal
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: H * 0.6 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sheetTitle: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.text },
  closeBtn: { fontSize: 18, color: Colors.textMuted, padding: 4 },
  sheetItem: { paddingHorizontal: Spacing.base, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sheetItemText: { fontSize: Typography.sizes.sm, color: Colors.text },

  // Empty state
  placeholder: { paddingVertical: 32, alignItems: 'center' },
  placeholderText: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
});
