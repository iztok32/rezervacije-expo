import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Sporočilo (uspeh, napaka, opozorilo) v obarvanem okencu z ikono, kot na ploščicah. */
export function Notice({ tone, text }: { tone: 'success' | 'danger' | 'warning'; text: string }) {
  const theme = useTheme();
  const color = theme[tone];
  const background = tone === 'success' ? theme.successSoft : tone === 'danger' ? theme.primarySoft : theme.warningBackground;
  const icon =
    tone === 'success'
      ? ({ ios: 'checkmark.circle.fill', md: 'check_circle' } as const)
      : tone === 'danger'
        ? ({ ios: 'exclamationmark.circle.fill', md: 'error' } as const)
        : ({ ios: 'exclamationmark.triangle.fill', md: 'warning' } as const);
  return (
    <View style={[styles.notice, { backgroundColor: background }]} accessibilityRole={tone === 'danger' ? 'alert' : undefined}>
      <Icon ios={icon.ios} md={icon.md} size={18} color={color} />
      <ThemedText style={[styles.text, { color }]}>{text}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, borderRadius: 14, padding: Spacing.three - Spacing.one },
  text: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: 600 },
});
