// Reusable DateInput — a tappable pseudo-input that opens the platform's
// native calendar picker. Drop-in replacement for TextInput on any date
// field (application_date, transaction_date, expense_date, etc.).
//
// Value format: always the standard YYYY-MM-DD string, so the field can be
// wired straight into any existing state/setter that previously held a
// text-typed date. If the picker package is not installed, the field falls
// back to a plain TextInput so nothing crashes.
//
// Install once (already in package.json):
//   npx expo install @react-native-community/datetimepicker
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, TextInput, Modal } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';

// Format Date → YYYY-MM-DD in local time (never UTC-shifted)
function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Parse YYYY-MM-DD → Date (local midnight)
function fromISO(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
  if (!m) return new Date();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

// Display form: DD/MM/YYYY
function displayDate(s: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (s || '');
}

interface Props {
  value: string;                          // YYYY-MM-DD
  onChange: (isoDate: string) => void;
  placeholder?: string;                   // Shown when empty
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  style?: any;
}

export function DateInput({
  value, onChange,
  placeholder = 'Select date',
  minimumDate, maximumDate, disabled, style,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  // Try to load the native date picker; fall back to a plain TextInput
  // if the package is not installed on this app version.
  let DateTimePicker: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    DateTimePicker = require('@react-native-community/datetimepicker').default;
  } catch (e) {
    DateTimePicker = null;
  }

  const handleChange = (_evt: any, selected?: Date) => {
    // Android's default picker auto-closes; iOS keeps it open until Done
    if (Platform.OS === 'android') setPickerOpen(false);
    if (selected) onChange(toISO(selected));
  };

  // ── Fallback: no picker package installed ─────────────────────────────
  if (!DateTimePicker) {
    return (
      <TextInput
        style={[styles.input, style]}
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={Colors.textMuted}
        editable={!disabled}
        autoCapitalize="none"
      />
    );
  }

  const dateValue = value ? fromISO(value) : new Date();

  return (
    <>
      <TouchableOpacity
        style={[styles.input, disabled && styles.inputDisabled, style]}
        onPress={() => !disabled && setPickerOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.inputText, !value && styles.placeholderText]}>
          {value ? displayDate(value) : placeholder}
        </Text>
        <Text style={styles.calendarIcon}>📅</Text>
      </TouchableOpacity>

      {/* iOS shows the picker in a bottom sheet with a Done button;
          Android shows the platform-native modal automatically */}
      {pickerOpen && Platform.OS === 'android' && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display="default"
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}

      {pickerOpen && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide" visible={pickerOpen} onRequestClose={() => setPickerOpen(false)}>
          <View style={styles.iosModalRoot}>
            <TouchableOpacity style={styles.iosBackdrop} activeOpacity={1} onPress={() => setPickerOpen(false)} />
            <View style={styles.iosSheet}>
              <View style={styles.iosHeader}>
                <TouchableOpacity onPress={() => setPickerOpen(false)}>
                  <Text style={styles.iosCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPickerOpen(false)}>
                  <Text style={styles.iosDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={dateValue}
                mode="date"
                display="spinner"
                onChange={handleChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
              />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#fff',
    minHeight: 44,
  },
  inputDisabled: { backgroundColor: '#f1f5f9', opacity: 0.7 },
  inputText: { fontSize: 14, color: Colors.text, flex: 1 },
  placeholderText: { color: Colors.textMuted },
  calendarIcon: { fontSize: 15, marginLeft: 8 },

  // iOS-only modal styles
  iosModalRoot: { flex: 1, justifyContent: 'flex-end' },
  iosBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  iosSheet: { backgroundColor: '#fff', paddingBottom: 20 },
  iosHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  iosCancel: { color: Colors.textMuted, fontSize: 15, fontWeight: '500' },
  iosDone:   { color: Colors.primary, fontSize: 15, fontWeight: '700' },
});
