import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, Radius, Shadow } from '@/constants/theme';
import type { Client } from '@/lib/types';

interface Props { client: Client; onPress?: () => void; }

export function ClientRow({ client, onPress }: Props) {
  const name = `${client.firstname} ${client.lastname}`;
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0,2).toUpperCase();

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={styles.phone}>{client.phonenumber || '—'}</Text>
      </View>
      <View style={styles.right}>
        {client.registered_office_name && (
          <View style={styles.officeBadge}>
            <Text style={styles.officeBadgeText}>{client.registered_office_name}</Text>
          </View>
        )}
        <Text style={styles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.xs,
    ...Shadow.sm, borderWidth: 1, borderColor: Colors.border,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.teal + '20', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: Colors.teal, fontWeight: '700', fontSize: 13 },
  info: { flex: 1 },
  name: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.text },
  phone: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 1 },
  right: { alignItems: 'flex-end', gap: 4 },
  officeBadge: {
    backgroundColor: Colors.primary + '12',
    borderRadius: Radius.full,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  officeBadgeText: { fontSize: 9, color: Colors.primary, fontWeight: '600' },
  arrow: { color: Colors.textMuted, fontSize: 18 },
});
