/**
 * Familink Design Tokens
 * ------------------------------------------------------------------
 * Ported 1:1 from the completed web MVP (app-source/familink.html `:root`).
 * The web app follows an Apple-native (iOS) visual language; we keep the
 * exact hex values so the React Native app feels identical in spirit.
 *
 * IMPORTANT: This is the single source of truth for color/spacing/radius.
 * Do not hard-code hex values in components — reference these tokens.
 */

export const palette = {
  // Primary (iOS systemBlue family)
  primary: '#0A84FF',
  primaryDark: '#0060D8',
  primaryLight: '#E8F3FF',
  primaryMid: '#C7E2FF',

  // Secondary (systemGreen)
  secondary: '#34C759',
  secondaryDark: '#248A3D',
  secondaryLight: '#D4F5DF',

  // Accent (systemOrange) — also the "premium" color
  accent: '#FF9F0A',
  accentLight: '#FFF3E0',
  accentDark: '#C77400',

  // Status / category colors
  red: '#FF3B30',
  redLight: '#FFECEB',
  orange: '#FF9500',
  orangeLight: '#FFF3E0',
  purple: '#AF52DE',
  purpleLight: '#F2EEFF',
  pink: '#FF2D55',
  pinkLight: '#FFE8EE',
  indigo: '#5856D6',
  indigoLight: '#EEEEFF',
  yellow: '#FFD60A',

  premium: '#FF9F0A',
  premiumLight: '#FFF6E8',
  premiumBg: '#FFF3E0',
} as const;

export interface ThemeColors {
  bg: string;
  bgCard: string;
  bgMuted: string;
  bgGrouped: string;
  bgInset: string;
  text: string;
  textSub: string;
  textMuted: string;
  border: string;
  borderLight: string;
  // palette (shared)
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryMid: string;
  secondary: string;
  secondaryDark: string;
  secondaryLight: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  red: string;
  redLight: string;
  orange: string;
  orangeLight: string;
  purple: string;
  purpleLight: string;
  pink: string;
  pinkLight: string;
  indigo: string;
  indigoLight: string;
  yellow: string;
  premium: string;
  premiumLight: string;
  premiumBg: string;
}

/** Light theme surface + text colors (web default). */
export const lightTheme: ThemeColors = {
  bg: '#F2F2F7',
  bgCard: '#FFFFFF',
  bgMuted: '#EBEBF0',
  bgGrouped: '#F2F2F7',
  bgInset: '#EFEFF4',

  text: '#1C1C1E',
  textSub: '#3C3C43',
  textMuted: 'rgba(60,60,67,0.72)',

  border: 'rgba(60,60,67,0.18)',
  borderLight: 'rgba(60,60,67,0.10)',

  ...palette,
};

/** Dark theme — derived to mirror iOS dark surfaces. */
export const darkTheme: ThemeColors = {
  bg: '#000000',
  bgCard: '#1C1C1E',
  bgMuted: '#2C2C2E',
  bgGrouped: '#000000',
  bgInset: '#1C1C1E',

  text: '#FFFFFF',
  textSub: 'rgba(235,235,245,0.85)',
  textMuted: 'rgba(235,235,245,0.6)',

  border: 'rgba(84,84,88,0.6)',
  borderLight: 'rgba(84,84,88,0.34)',

  ...palette,
};

/** Border radii (web: --r-sm … --r-2xl). */
export const radius = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 26,
  xxl: 34,
  full: 9999,
} as const;

/** Spacing scale (4pt grid). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Elevation / shadow presets (iOS-flavored soft shadows). */
export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

/** Type scale. */
export const typography = {
  largeTitle: { fontSize: 34, fontWeight: '700' as const, lineHeight: 41 },
  title: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  title2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  title3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 25 },
  headline: { fontSize: 17, fontWeight: '600' as const, lineHeight: 22 },
  body: { fontSize: 17, fontWeight: '400' as const, lineHeight: 22 },
  callout: { fontSize: 16, fontWeight: '400' as const, lineHeight: 21 },
  subhead: { fontSize: 15, fontWeight: '400' as const, lineHeight: 20 },
  footnote: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
} as const;

/** Member avatar accent colors used across calendar/budget visibility. */
export const memberColors = [
  '#0A84FF',
  '#FF9F0A',
  '#34C759',
  '#AF52DE',
  '#FF2D55',
  '#5856D6',
  '#FF9500',
  '#248A3D',
] as const;
