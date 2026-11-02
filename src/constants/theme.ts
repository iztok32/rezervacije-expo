/**
 * Grafična podoba po spletni strani KK Karlo (kkkarlo.si): rdeča iz logotipa (#ED1C24),
 * temno siva iz napisa »KARLO«, zlata iz traku »Since 1996« in pisava Montserrat.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Brand = {
  red: '#ED1C24',
  redDark: '#B11018',
  charcoal: '#2B2B2B',
  gold: '#C9A227',
} as const;

export const Colors = {
  light: {
    text: '#232325',
    background: '#F5F3F0',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EFEAE4',
    textSecondary: '#676A70',
    border: '#E6E1DA',
    // Rdeča za besedilo in gumbe — malo temnejša od logotipa zaradi berljivosti na beli
    primary: '#D6141B',
    primaryPressed: Brand.redDark,
    primarySoft: '#FDECEC',
    onPrimary: '#FFFFFF',
    gold: '#9A7614',
    goldSoft: '#F7F0DC',
    success: '#237A3B',
    successSoft: '#E6F3E9',
    danger: '#B3261E',
    warning: '#8A5A00',
    warningBackground: '#FFF4D6',
  },
  dark: {
    text: '#F4F2EF',
    background: '#121213',
    backgroundElement: '#1D1D20',
    backgroundSelected: '#2B2B2F',
    textSecondary: '#A9ABB0',
    border: '#2F2F33',
    primary: '#FF4C52',
    primaryPressed: '#E0353B',
    primarySoft: '#3A1B1C',
    onPrimary: '#FFFFFF',
    gold: '#D9B25F',
    goldSoft: '#332A17',
    success: '#5CC27A',
    successSoft: '#18301F',
    danger: '#FF6B63',
    warning: '#F6C35B',
    warningBackground: '#3A2E12',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Montserrat (kot kkkarlo.si) — naloži jo korenska postavitev, imena so iz @expo-google-fonts/montserrat. */
export const FontFamily = {
  regular: 'Montserrat_400Regular',
  medium: 'Montserrat_500Medium',
  semibold: 'Montserrat_600SemiBold',
  bold: 'Montserrat_700Bold',
  extrabold: 'Montserrat_800ExtraBold',
} as const;

/** Debelina pisave → datoteka pisave (pri lastnih pisavah RN debeline ne izbere sam). */
export function fontForWeight(weight: string | number | undefined): string {
  const w = Number(weight === 'bold' ? 700 : weight === 'normal' || weight === undefined ? 500 : weight);
  if (w >= 800) return FontFamily.extrabold;
  if (w >= 700) return FontFamily.bold;
  if (w >= 600) return FontFamily.semibold;
  if (w >= 500) return FontFamily.medium;
  return FontFamily.regular;
}

export const Fonts = Platform.select({
  ios: {
    sans: FontFamily.medium,
    mono: 'ui-monospace',
  },
  default: {
    sans: FontFamily.medium,
    mono: 'monospace',
  },
  web: {
    sans: FontFamily.medium,
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 8,
  medium: 12,
  large: 18,
} as const;

/** Rahla senca kartic (boxShadow deluje na spletu, iOS in Androidu z novo arhitekturo). */
export const CardShadow = '0px 1px 3px rgba(32, 24, 16, 0.08), 0px 4px 14px rgba(32, 24, 16, 0.05)';

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
