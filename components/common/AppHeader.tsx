import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Shadow } from '@/constants/theme';
import { BranchSelectorButton } from './BranchSelector';
import { useBranchStore } from '@/store/branchStore';

interface Props {
  title: string;
  subtitle?: string;
  onMenuPress: () => void;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export function AppHeader({ title, subtitle, onMenuPress, showBack = false, rightAction }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.inner}>
          {/* Left: hamburger or back */}
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={showBack ? router.back : onMenuPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.menuIcon}>{showBack ? '←' : '☰'}</Text>
          </TouchableOpacity>

          {/* Center: title + branch selector */}
          <View style={styles.center}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {/* Branch selector for HQ users — replaces subtitle */}
            <BranchSelectorButton />
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
            ) : null}
          </View>

          {/* Right */}
          <View style={styles.right}>
            {rightAction ?? <View style={{ width: 40 }} />}
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.primary, ...Shadow.md, zIndex: 100 },
  inner: {
    flexDirection: 'row', alignItems: 'center',
    minHeight: 56, paddingHorizontal: Spacing.md, gap: Spacing.sm,
  },
  menuBtn: {
    width: 40, height: 40, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  menuIcon: { color: '#fff', fontSize: 20 },
  center: { flex: 1, justifyContent: 'center', gap: 3 },
  title: { color: '#fff', fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: Typography.sizes.xs },
  right: { width: 40, alignItems: 'flex-end' },
});
