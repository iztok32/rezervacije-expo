import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, CardShadow, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Odmik vsebine: na napravi varno območje + spodnji zavihki, na spletu plavajoča vrstica zavihkov zgoraj.
export function useContentPadding(): ViewStyle {
  const insets = useSafeAreaInsets();
  return Platform.select({
    web: { paddingTop: Spacing.six + Spacing.five, paddingBottom: Spacing.four },
    default: {
      paddingTop: insets.top + Spacing.three,
      paddingBottom: insets.bottom + BottomTabInset + Spacing.three,
    },
  });
}

/** Glava zaslona v slogu kkkarlo.si: znak konja, rdeč nadnaslov, krepak naslov in rdeča črta. */
export function ScreenHeader({
  title,
  right,
  overline = 'KK Karlo',
}: {
  title: string;
  right?: ReactNode;
  overline?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <Image source={require('@/assets/images/brand/horse-mark.png')} style={styles.mark} contentFit="contain" />
        <ThemedText type="overline">{overline}</ThemedText>
      </View>
      <View style={styles.titleRow}>
        <ThemedText type="subtitle" style={styles.headerTitle}>
          {title}
        </ThemedText>
        {right}
      </View>
      <View style={[styles.accent, { backgroundColor: theme.primary }]} />
    </View>
  );
}

export function CenteredState({ loading, message }: { loading?: boolean; message?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.centered}>
      {loading && <ActivityIndicator color={theme.primary} />}
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
    gap: Spacing.three - Spacing.one,
  },
  card: {
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.one,
    boxShadow: CardShadow,
  },
});

const styles = StyleSheet.create({
  header: { gap: Spacing.one, marginBottom: Spacing.two },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  mark: { width: 26, height: 25 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  headerTitle: { flexShrink: 1 },
  accent: { width: 40, height: 4, borderRadius: 2, marginTop: Spacing.one },
  centered: { paddingVertical: Spacing.six, alignItems: 'center', gap: Spacing.two },
  centeredText: { textAlign: 'center' },
});
