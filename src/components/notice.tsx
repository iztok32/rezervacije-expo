import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Obrobljeno sporočilo (uspeh, napaka, opozorilo) v podoknih. */
export function Notice({ tone, text }: { tone: 'success' | 'danger' | 'warning'; text: string }) {
  const theme = useTheme();
  const color = theme[tone];
  return (
    <View style={[styles.notice, { borderColor: color }]}>
      <ThemedText type="small" style={{ color }}>
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { borderWidth: 1, borderRadius: Spacing.two, padding: Spacing.two },
});
