import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { ScreenLayout } from '@/components/common/ScreenLayout';
import { DateInput } from '@/components/ui/DateInput';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import { ClientService } from '@/lib/services';
import { QK } from '@/lib/queryClient';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}{required && <Text style={{ color: Colors.error }}> *</Text>}</Text>
      {children}
    </View>
  );
}
function TInput({ value, onChangeText, placeholder, keyboardType, autoCapitalize }: any) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Colors.textMuted}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize ?? 'words'}
    />
  );
}

export default function NewClientScreen() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    firstname: '', middlename: '', lastname: '',
    phonenumber: '', date_of_birth: '',
    marital_status: '', employername: '', idara: '',
    kaziyako: '', checkno: '', region: '', district: '',
    street: '', bank_name: '', bank_account_number: '',
    mdhamini_name: '', mdhamini_phonenumber: '',
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const { mutate, isPending } = useMutation({
    mutationFn: () => ClientService.create(form as any),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: QK.clients() });
      Toast.show({ type: 'success', text1: 'Client Registered', text2: form.firstname + ' ' + form.lastname });
      router.back();
    },
    onError: (e: any) => {
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : 'Registration failed.';
      Toast.show({ type: 'error', text1: 'Error', text2: msg, visibilityTime: 5000 });
    },
  });

  const Section = ({ title }: { title: string }) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  return (
    <ScreenLayout title="New Client" showBack>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <Section title="Personal Information" />
          <View style={styles.card}>
            <Field label="First Name" required><TInput value={form.firstname} onChangeText={(v:string)=>set('firstname',v)} placeholder="e.g. John" /></Field>
            <Field label="Middle Name"><TInput value={form.middlename} onChangeText={(v:string)=>set('middlename',v)} placeholder="e.g. Baraka" /></Field>
            <Field label="Last Name" required><TInput value={form.lastname} onChangeText={(v:string)=>set('lastname',v)} placeholder="e.g. Doe" /></Field>
            <Field label="Phone Number" required><TInput value={form.phonenumber} onChangeText={(v:string)=>set('phonenumber',v)} placeholder="e.g. 0712345678" keyboardType="phone-pad" autoCapitalize="none" /></Field>
            <Field label="Date of Birth">
              <DateInput
                value={form.date_of_birth}
                onChange={(v:string)=>set('date_of_birth',v)}
                placeholder="Select date of birth"
                maxDate={new Date().toISOString().split('T')[0].split('-').map((p,i)=>i===0?String(Number(p)-15):p).join('-')}
              />
            </Field>
            <Field label="Marital Status"><TInput value={form.marital_status} onChangeText={(v:string)=>set('marital_status',v)} placeholder="e.g. Married" /></Field>
          </View>

          <Section title="Employment" />
          <View style={styles.card}>
            <Field label="Employer"><TInput value={form.employername} onChangeText={(v:string)=>set('employername',v)} placeholder="e.g. Government" /></Field>
            <Field label="Department (Idara)"><TInput value={form.idara} onChangeText={(v:string)=>set('idara',v)} placeholder="e.g. Finance" /></Field>
            <Field label="Job Title"><TInput value={form.kaziyako} onChangeText={(v:string)=>set('kaziyako',v)} placeholder="e.g. Accountant" /></Field>
            <Field label="Employee ID / Check No"><TInput value={form.checkno} onChangeText={(v:string)=>set('checkno',v)} placeholder="e.g. EMP-001" autoCapitalize="none" /></Field>
          </View>

          <Section title="Address" />
          <View style={styles.card}>
            <Field label="Region"><TInput value={form.region} onChangeText={(v:string)=>set('region',v)} placeholder="e.g. Dar es Salaam" /></Field>
            <Field label="District"><TInput value={form.district} onChangeText={(v:string)=>set('district',v)} placeholder="e.g. Ilala" /></Field>
            <Field label="Street"><TInput value={form.street} onChangeText={(v:string)=>set('street',v)} placeholder="e.g. Msimbazi" /></Field>
          </View>

          <Section title="Bank Information" />
          <View style={styles.card}>
            <Field label="Bank Name"><TInput value={form.bank_name} onChangeText={(v:string)=>set('bank_name',v)} placeholder="e.g. CRDB Bank" /></Field>
            <Field label="Account Number"><TInput value={form.bank_account_number} onChangeText={(v:string)=>set('bank_account_number',v)} placeholder="e.g. 01234567890" keyboardType="numeric" autoCapitalize="none" /></Field>
          </View>

          <Section title="Guarantor (Mdhamini)" />
          <View style={styles.card}>
            <Field label="Guarantor Name"><TInput value={form.mdhamini_name} onChangeText={(v:string)=>set('mdhamini_name',v)} placeholder="Full name" /></Field>
            <Field label="Guarantor Phone"><TInput value={form.mdhamini_phonenumber} onChangeText={(v:string)=>set('mdhamini_phonenumber',v)} placeholder="0712345678" keyboardType="phone-pad" autoCapitalize="none" /></Field>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, isPending && { opacity: 0.7 }]}
            onPress={() => mutate()}
            disabled={isPending}
          >
            {isPending
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitText}>✓  Register Client</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.base, paddingBottom: 48, gap: Spacing.xs },
  sectionTitle: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.bold, color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.6, paddingTop: Spacing.sm, paddingBottom: 4 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.base, ...Shadow.sm, gap: Spacing.md },
  field: { gap: 6 },
  fieldLabel: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, color: Colors.textSecondary },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: Typography.sizes.base, color: Colors.text, backgroundColor: Colors.surfaceAlt },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center', marginTop: Spacing.md, ...Shadow.md },
  submitText: { color: '#fff', fontWeight: Typography.weights.bold, fontSize: Typography.sizes.base },
});
