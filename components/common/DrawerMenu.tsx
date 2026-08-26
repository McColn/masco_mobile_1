// components/common/DrawerMenu.tsx
// Full sidebar drawer — mirrors HTML django nav exactly
// White theme with navy sidebar

import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Dimensions, TouchableWithoutFeedback, Image,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore, selectIsHQView } from '@/store/branchStore';
import { HQ_NAV, BRANCH_NAV, NavItem, NavChild } from '@/lib/navigation';
import { Colors, Typography, Spacing } from '@/constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const DRAWER_W = Math.min(SCREEN_W * 0.82, 320);

interface Props {
  visible: boolean;
  onClose: () => void;
}

function SubmenuItem({ item, onClose }: { item: NavChild; onClose: () => void }) {
  const handlePress = () => {
    onClose();
    setTimeout(() => router.push(item.route as any), 200);
  };
  return (
    <TouchableOpacity style={styles.submenuItem} onPress={handlePress} activeOpacity={0.7}>
      <Text style={styles.submenuIcon}>{item.icon}</Text>
      <Text style={styles.submenuLabel}>{item.label}</Text>
    </TouchableOpacity>
  );
}

function NavSection({ item, onClose }: { item: NavItem; onClose: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  if (!item.children) {
    return (
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => { onClose(); setTimeout(() => router.push(item.route as any), 200); }}
        activeOpacity={0.8}
      >
        <Text style={styles.navIcon}>{item.icon}</Text>
        <Text style={styles.navLabel}>{item.label}</Text>
      </TouchableOpacity>
    );
  }

  const toggle = () => {
    const toVal = expanded ? 0 : 1;
    Animated.spring(anim, { toValue: toVal, useNativeDriver: false, tension: 80, friction: 10 }).start();
    setExpanded(!expanded);
  };

  const maxH = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, item.children.length * 48 + 8],
  });
  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View>
      <TouchableOpacity style={[styles.navItem, expanded && styles.navItemActive]} onPress={toggle} activeOpacity={0.8}>
        <Text style={styles.navIcon}>{item.icon}</Text>
        <Text style={[styles.navLabel, expanded && styles.navLabelActive]}>{item.label}</Text>
        <Animated.Text style={[styles.arrow, { transform: [{ rotate }] }, expanded && styles.arrowActive]}>
          ›
        </Animated.Text>
      </TouchableOpacity>
      <Animated.View style={[styles.submenu, { maxHeight: maxH, overflow: 'hidden' }]}>
        {item.children.map((child) => (
          <SubmenuItem key={child.key} item={child} onClose={onClose} />
        ))}
      </Animated.View>
    </View>
  );
}

export function DrawerMenu({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-DRAWER_W)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const { user, logout } = useAuthStore();
  const { selectedBranch, viewingHQ, branches } = useBranchStore();

  // Determine menu based on role / selected branch
  // Menu switches based on which branch is currently SELECTED
  // HQ user viewing HQ → HQ menu
  // HQ user viewing a branch → BRANCH menu (same as branch staff)
  const isHQView = selectIsHQView(
    user?.is_superuser ?? false,
    viewingHQ,
    branches.length,
  );
  const navItems = isHQView ? HQ_NAV : BRANCH_NAV;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: -DRAWER_W, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible && slideAnim._value === -DRAWER_W) return null;

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents={visible ? 'auto' : 'none'}>
      {/* Overlay */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} />
      </TouchableWithoutFeedback>

      {/* Drawer panel */}
      <Animated.View
        style={[
          styles.drawer,
          { width: DRAWER_W, paddingTop: insets.top, transform: [{ translateX: slideAnim }] },
        ]}
      >
        {/* Header */}
        <View style={styles.drawerHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>{user?.full_name || 'User'}</Text>
            <Text style={styles.headerBranch} numberOfLines={1}>
              {selectedBranch?.name || user?.office || 'MASCO Finance'}
            </Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{isHQView ? 'HQ' : selectedBranch?.name || 'Branch'}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.headerDivider} />

        {/* Nav items */}
        <ScrollView
          style={styles.navScroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {navItems.map((item) => (
            <NavSection key={item.key} item={item} onClose={onClose} />
          ))}

          {/* Bottom actions */}
          <View style={styles.bottomSection}>
            <View style={styles.sectionDivider} />
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => { onClose(); setTimeout(() => router.push('/(tabs)/profile' as any), 200); }}
            >
              <Text style={styles.navIcon}>👤</Text>
              <Text style={styles.navLabel}>My Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navItem, styles.logoutItem]}
              onPress={() => { onClose(); setTimeout(() => logout(), 300); }}
            >
              <Text style={styles.navIcon}>🚪</Text>
              <Text style={styles.logoutLabel}>Logout</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.drawerFooter, { paddingBottom: insets.bottom + 8 }]}>
          <Text style={styles.footerText}>MASCO Finance v1.0</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: Colors.sidebarBg,
    flexDirection: 'column',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerInfo: { flex: 1, gap: 2 },
  headerName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  headerBranch: {
    color: Colors.sidebarText,
    fontSize: 12,
    opacity: 0.8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accent,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
  },
  roleText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  closeBtnText: { color: '#fff', fontSize: 14 },
  headerDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  navScroll: { flex: 1 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  navItemActive: {
    backgroundColor: Colors.sidebarActiveBg,
  },
  navIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  navLabel: {
    flex: 1,
    color: Colors.sidebarText,
    fontSize: 14,
    fontWeight: '500',
  },
  navLabelActive: { color: Colors.sidebarActive },
  arrow: {
    color: Colors.sidebarText,
    fontSize: 20,
    fontWeight: '300',
    marginRight: 4,
    opacity: 0.7,
  },
  arrowActive: { color: Colors.sidebarActive },
  submenu: {
    backgroundColor: Colors.sidebarSubBg,
  },
  submenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingLeft: 46,
    paddingVertical: 11,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  submenuIcon: { fontSize: 13, width: 20, textAlign: 'center' },
  submenuLabel: {
    flex: 1,
    color: 'rgba(226,232,240,0.85)',
    fontSize: 13,
    fontWeight: '400',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  bottomSection: { paddingTop: 8 },
  logoutItem: {},
  logoutLabel: {
    flex: 1,
    color: '#fca5a5',
    fontSize: 14,
    fontWeight: '500',
  },
  drawerFooter: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  footerText: {
    color: 'rgba(148,163,184,0.6)',
    fontSize: 11,
    textAlign: 'center',
  },
});
