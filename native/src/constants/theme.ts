import { Platform } from 'react-native';

// ─── Color Palette ────────────────────────────────────────────────────────────

export const Colors = {
  // Brand
  primary: '#0A84FF',
  primaryLight: '#E8F3FF',
  primaryDark: '#0060CC',

  // Semantic
  success: '#34C759',
  successLight: '#E8F9ED',
  warning: '#FF9500',
  warningLight: '#FFF3E0',
  error: '#FF3B30',
  errorLight: '#FFEBEA',
  info: '#5AC8FA',

  // Neutrals (iOS system)
  text: '#1C1C1E',
  textSub: '#48484A',
  textMuted: '#8E8E93',
  textPlaceholder: '#AEAEB2',

  // Backgrounds
  background: '#F2F2F7',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  bgMuted: '#F2F2F7',
  bgHover: '#E5E5EA',

  // Borders
  border: '#C6C6C8',
  borderLight: '#E5E5EA',

  // Tabs
  tabActive: '#0A84FF',
  tabInactive: '#8E8E93',

  // Member colors
  memberColors: [
    '#5B7FFF', '#FF6B6B', '#4CC9A0', '#FFAB40',
    '#AB69D8', '#26C6DA', '#EF5350', '#66BB6A',
  ],

  // Category colors for budget
  budgetCategories: {
    food: '#FF6B6B',
    transport: '#5B7FFF',
    entertainment: '#FFAB40',
    medical: '#4CC9A0',
    education: '#AB69D8',
    shopping: '#26C6DA',
    utilities: '#78909C',
    other: '#8E8E93',
  },
} as const;

// Dark mode colors
export const DarkColors = {
  primary: '#0A84FF',
  primaryLight: '#0D2A4A',
  primaryDark: '#3B9EFF',

  success: '#32D74B',
  successLight: '#0D2E14',
  warning: '#FF9F0A',
  warningLight: '#2E1C00',
  error: '#FF453A',
  errorLight: '#3A0D0A',
  info: '#64D2FF',

  text: '#FFFFFF',
  textSub: '#EBEBF5',
  textMuted: '#8E8E93',
  textPlaceholder: '#636366',

  background: '#000000',
  card: '#1C1C1E',
  cardElevated: '#2C2C2E',
  bgMuted: '#1C1C1E',
  bgHover: '#2C2C2E',

  border: '#38383A',
  borderLight: '#2C2C2E',

  tabActive: '#0A84FF',
  tabInactive: '#8E8E93',
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────

export const Typography = {
  // Font sizes
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 28,
  xxxl: 34,

  // Font weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,

  // Line heights
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.7,

  // Font family
  system: Platform.OS === 'ios' ? 'System' : 'Roboto',
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 24,
  full: 9999,
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.20,
    shadowRadius: 32,
    elevation: 16,
  },
} as const;

// ─── Animation ────────────────────────────────────────────────────────────────

export const Animation = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: {
    damping: 18,
    stiffness: 200,
    mass: 0.8,
  },
} as const;

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

export const TAB_BAR_HEIGHT = 82;
export const HEADER_HEIGHT = 56;
