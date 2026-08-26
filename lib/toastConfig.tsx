import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Typography } from '@/constants/theme';

function ToastBase({ text1, text2, accent }: { text1: string; text2?: string; accent: string }) {
  return (
    <View style={[styles.toast, { borderLeftColor: accent }]}>
      <Text style={styles.title}>{text1}</Text>
      {text2 ? <Text style={styles.body}>{text2}</Text> : null}
    </View>
  );
}

export const toastConfig = {
  success: ({ text1, text2 }: any) => <ToastBase text1={text1} text2={text2} accent={Colors.success} />,
  error:   ({ text1, text2 }: any) => <ToastBase text1={text1} text2={text2} accent={Colors.error} />,
  info:    ({ text1, text2 }: any) => <ToastBase text1={text1} text2={text2} accent={Colors.info} />,
};

const styles = StyleSheet.create({
  toast: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderLeftWidth: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    minWidth: 280,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  title: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.text },
  body:  { fontSize: Typography.sizes.xs, color: Colors.textSecondary, marginTop: 2 },
});
