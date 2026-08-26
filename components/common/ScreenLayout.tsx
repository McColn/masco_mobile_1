// components/common/ScreenLayout.tsx
// Shared layout for all screens — AppHeader + content + optional DrawerMenu
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppHeader } from './AppHeader';
import { DrawerMenu } from './DrawerMenu';
import { useDrawer } from '@/lib/drawerContext';
import { Colors } from '@/constants/theme';

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
}

export function ScreenLayout({ title, subtitle, showBack = false, rightAction, children }: Props) {
  const { isOpen, open, close } = useDrawer();
  const { selectedBranch, viewingHQ } = require('@/store/branchStore').useBranchStore();
  const menuKey = `${selectedBranch?.id ?? 'none'}-${viewingHQ}`;
  return (
    <View style={styles.root}>
      <AppHeader
        title={title}
        subtitle={subtitle}
        onMenuPress={open}
        showBack={showBack}
        rightAction={rightAction}
      />
      <View style={styles.body}>{children}</View>
      <DrawerMenu key={menuKey} visible={isOpen} onClose={close} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  body: { flex: 1 },
});
