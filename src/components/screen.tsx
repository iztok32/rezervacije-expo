import type { ReactNode } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

// Odmik vsebine: na napravi varno območje + spodnji zavihki, na spletu plavajoča vrstica zavihkov zgoraj.
export function useContentPadding(): ViewStyle {
  const insets = useSafeAreaInsets();
  return Platform.select({
    web: { paddingTop: Spacing.six + Spacing.four, paddingBottom: Spacing.four },
    default: {
      paddingTop: insets.top + Spacing.three,
      paddingBottom: insets.bottom + BottomTabInset + Spacing.three,
    },
  });
}

export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <ThemedText type="subtitle" style={styles.headerTitle}>
        {title}
      </ThemedText>
      {right}
    </View>
  );
}

export function CenteredState({ loading, message }: { loading?: boolean; message?: string }) {
  return (
    <View style={styles.centered}>
      {loading && <ActivityIndicator />}
      {message && (
        <ThemedText themeColor="textSecondary" style={styles.centeredText}>
          {message}
        </ThemedText>
      )}
    </View>
  );
}

export const screenStyles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  headerTitle: { flexShrink: 1 },
  centered: { paddingVertical: Spacing.six, alignItems: 'center', gap: Spacing.two },
  centeredText: { textAlign: 'center' },
});
