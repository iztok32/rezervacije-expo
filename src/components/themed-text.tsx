import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { Fonts, fontForWeight, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'overline' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const base = type === 'linkPrimary' || type === 'overline' ? theme.primary : theme[themeColor ?? 'text'];
  const flat = StyleSheet.flatten([styles[type], style]) as TextStyle | undefined;
  // Montserrat ima ločeno datoteko za vsako debelino — izberemo jo po fontWeight
  const font = type === 'code' ? undefined : { fontFamily: fontForWeight(flat?.fontWeight), fontWeight: 'normal' as const };

  return <Text style={[{ color: base }, styles[type], style, font]} {...rest} />;
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: 800,
  },
  subtitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: 800,
  },
  overline: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 700,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
    fontWeight: 600,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    fontWeight: 700,
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
});
