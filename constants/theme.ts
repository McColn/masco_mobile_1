// constants/theme.ts — MASCO Finance White Theme

export const Colors = {
  // Brand
  primary: '#1a3c6e',        // deep navy blue — primary actions, headers
  primaryDark: '#122a52',
  primaryLight: '#2651a0',
  accent: '#c8860a',         // gold accent — badges, highlights
  accentLight: '#f0a820',
  teal: '#0891b2',           // teal — secondary accent
  tealLight: '#e0f7fa',

  // Semantic
  success: '#16a34a',
  successLight: '#dcfce7',
  warning: '#d97706',
  warningLight: '#fef3c7',
  error: '#dc2626',
  danger: '#dc2626',
  errorLight: '#fee2e2',
  info: '#2563eb',
  infoLight: '#dbeafe',

  // White theme surfaces
  background: '#f4f6f9',     // page background — light grey
  surface: '#ffffff',        // cards, inputs
  surfaceAlt: '#f8fafc',     // subtle alt surface
  border: '#e2e8f0',         // dividers
  borderDark: '#cbd5e1',

  // Text
  text: '#0f172a',           // primary text — near black
  textPrimary: '#0f172a',
  textSecondary: '#475569',  // secondary — slate
  textMuted: '#94a3b8',      // placeholder, metadata
  textInverse: '#ffffff',    // text on dark bg

  // Sidebar
  sidebarBg: '#1a3c6e',
  sidebarText: '#e2e8f0',
  sidebarActive: '#c8860a',
  sidebarActiveBg: 'rgba(200,134,10,0.15)',
  sidebarSubBg: '#122a52',

  // Overlay
  overlay: 'rgba(15, 23, 42, 0.5)',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
} as const;

const _sizes = {
  xs: 11, sm: 13, base: 15, md: 17, lg: 20,
  xl: 24, '2xl': 28, '3xl': 34, '4xl': 40,
} as const;

const _weights = {
  regular: '400' as const,
  medium:  '500' as const,
  semibold:'600' as const,
  bold:    '700' as const,
  extrabold:'800' as const,
};

export const Typography = {
  ..._sizes,
  ..._weights,
  sizes: _sizes,
  weights: _weights,
} as const;

export const Shadow = {
  sm: { shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 2 },
  md: { shadowColor: '#64748b', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  lg: { shadowColor: '#475569', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
} as const;
