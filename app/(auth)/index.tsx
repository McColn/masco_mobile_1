import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';
import { StatusBar } from 'expo-status-bar';

import { Colors, Spacing, Typography, Radius } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore } from '@/store/branchStore';
import { MascoLogo } from '@/components/common/MascoLogo';

const { height } = Dimensions.get('window');

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const [showPass, setShowPass] = useState(false);
  const { login, isLoading } = useAuthStore();
  const { loadBranches } = useBranchStore();

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  });

  // ONLY use the form's isSubmitting for the button loader — the auth
  // store's isLoading also flips true during the initial checkAuth() on
  // app boot, which would incorrectly show "Signing in…" the moment the
  // login screen appears.
  const busy = isSubmitting;

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.username, data.password);
      await loadBranches();
      router.replace('/(tabs)' as any);
    } catch (err: any) {
      const serverDetail = err?.response?.data?.detail;
      const serverError  = err?.response?.data?.non_field_errors?.[0];
      const httpStatus   = err?.response?.status;
      const networkErr   = err?.code === 'ECONNREFUSED' || err?.code === 'ERR_NETWORK';

      let msg: string;
      if (networkErr) {
        msg = 'Cannot reach server. Check your connection.';
      } else if (httpStatus === 401) {
        msg = serverDetail || 'Wrong username or password.';
      } else if (httpStatus === 404) {
        msg = 'Server not found. Check your API URL.';
      } else if (serverDetail) {
        msg = serverDetail;
      } else if (serverError) {
        msg = serverError;
      } else if (err?.message) {
        msg = err.message;
      } else {
        msg = 'Login failed. Please try again.';
      }

      Toast.show({ type: 'error', text1: 'Login Failed', text2: msg, visibilityTime: 4000 });
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Top hero section with logo ── */}
        <View style={styles.hero}>
          {/* Background decorative circles */}
          <View style={[styles.circle, styles.circleTopRight]} />
          <View style={[styles.circle, styles.circleBottomLeft]} />

          {/* ─────────────────────────────────────────────────────────
              LOGO PLACEMENT
              ─────────────────────────────────────────────────────────
              To add your logo:
              1. Add  assets/logo-white.png  (white version for dark bg)
              2. Open components/common/MascoLogo.tsx
              3. Set  HAS_WHITE_LOGO = true
              ───────────────────────────────────────────────────────── */}
          <MascoLogo variant="dark" size="lg" />

          <Text style={styles.heroSubtitle}>Sign in to your account</Text>
        </View>

        {/* ── Login form card ── */}
        <View style={styles.card}>

          {/* Username */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Username</Text>
            <Controller
              control={control}
              name="username"
              render={({ field: { value, onChange, onBlur } }) => (
                <View style={[styles.inputWrapper, errors.username && styles.inputError]}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Enter your username"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!busy}
                  />
                </View>
              )}
            />
            {errors.username && (
              <Text style={styles.errorMsg}>{errors.username.message}</Text>
            )}
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Password</Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { value, onChange, onBlur } }) => (
                <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Enter your password"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!showPass}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!busy}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPass(v => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.showPassBtn}>{showPass ? '🙈' : '👁'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.password && (
              <Text style={styles.errorMsg}>{errors.password.message}</Text>
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, busy && styles.submitBtnLoading]}
            onPress={handleSubmit(onSubmit)}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.submitText}>Signing in...</Text>
              </View>
            ) : (
              <Text style={styles.submitText}>Sign In</Text>
            )}
          </TouchableOpacity>

        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>MASCO Finance Co. Ltd</Text>
          <Text style={styles.footerVersion}>Microfinance Management System</Text>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const NAVY    = '#0d1b2e';
const TEAL    = '#3dd6c8';

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, backgroundColor: NAVY },

  // Hero
  hero: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: Spacing.xl,
    backgroundColor: NAVY,
    minHeight: height * 0.42,
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(61,214,200,0.07)',
  },
  circleTopRight: { width: 300, height: 300, top: -80,  right: -80  },
  circleBottomLeft: { width: 180, height: 180, bottom: 20, left: -50 },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 10,
    letterSpacing: 0.5,
  },

  // Card
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.xl,
    paddingTop: 32,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },

  // Fields
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 2,
    backgroundColor: '#f8f8f8',
    gap: 10,
  },
  inputError: { borderColor: Colors.error },
  inputIcon: { fontSize: 16 },
  input: {
    flex: 1,
    fontSize: Typography.sizes.base,
    color: '#111',
    paddingVertical: 12,
  },
  showPassBtn: { fontSize: 16, padding: 4 },
  errorMsg: { fontSize: 11, color: Colors.error, marginTop: 2 },

  // Submit
  submitBtn: {
    backgroundColor: NAVY,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnLoading: { backgroundColor: NAVY + 'cc' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.5 },

  // Footer
  footer: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#fff', gap: 4 },
  footerText: { fontSize: 12, color: '#999', fontWeight: '600' },
  footerVersion: { fontSize: 10, color: '#bbb' },
});
