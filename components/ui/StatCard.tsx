// components/ui/StatCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, Spacing, Typography, Shadow } from '@/constants/theme';

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  accent?: 'gold' | 'teal' | 'success' | 'danger';
  icon?: React.ReactNode;
  trend?: { value: string; positive: boolean };
}

export default function StatCard({
  label,
  value,
  subValue,
  accent = 'gold',
  icon,
  trend,
}: StatCardProps) {
  const accentColors: Record<string, [string, string]> = {
    gold: [Colors.gold, '#b8790d'],
    teal: [Colors.teal, Colors.tealDark],
    success: ['#22c55e', '#16a34a'],
    danger: ['#ef4444', '#dc2626'],
  };

  return (
    <View style={[styles.card, Shadow.md]}>
      {/* Accent bar */}
      <LinearGradient
        colors={accentColors[accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentBar}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
          {icon && (
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: accentColors[accent][0] + '22' },
              ]}
            >
              {icon}
            </View>
          )}
        </View>

        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>

        {(subValue || trend) && (
          <View style={styles.footer}>
            {subValue && (
              <Text style={styles.subValue} numberOfLines={1}>
                {subValue}
              </Text>
            )}
            {trend && (
              <Text
                style={[
                  styles.trend,
                  { color: trend.positive ? Colors.success : Colors.danger },
                ]}
              >
                {trend.positive ? '▲' : '▼'} {trend.value}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    flex: 1,
    minWidth: 140,
  },
  accentBar: {
    height: 3,
  },
  content: {
    padding: Spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    fontWeight: Typography.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flex: 1,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xs,
  },
  value: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  subValue: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    flex: 1,
  },
  trend: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
  },
});
