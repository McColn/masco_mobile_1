import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Typography, Radius } from '@/constants/theme';

export function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔧</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.desc}>{description ?? 'This screen is under development.'}</Text>
      <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
        <Text style={styles.btnText}>← Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['2xl'] },
  icon: { fontSize: 56, marginBottom: Spacing.lg },
  title: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.text, textAlign: 'center', marginBottom: Spacing.sm },
  desc: { fontSize: Typography.sizes.sm, color: Colors.textMuted, textAlign: 'center', marginBottom: Spacing.xl },
  btn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  btnText: { color: '#fff', fontWeight: Typography.weights.semibold, fontSize: Typography.sizes.sm },
});
