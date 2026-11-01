import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useConnectivity } from '@/lib/connectivity';

/** Obvestilo brez povezave: oddaja in odpoved rezervacij nista mogoči. */
export function OfflineBanner({ savedAt }: { savedAt?: string | null }) {
  const { isOnline } = useConnectivity();
  const theme = useTheme();
  if (isOnline) return null;

  const when = savedAt
    ? new Date(savedAt).toLocaleString('sl-SI', {
        day: 'numeric',
        month: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <ThemedView style={[styles.banner, { backgroundColor: theme.warningBackground }]}>
      <ThemedText type="smallBold" style={{ color: theme.warning }}>
        Brez povezave s strežnikom
      </ThemedText>
      <ThemedText type="small" style={{ color: theme.warning }}>
        Rezervacij ni mogoče oddajati ali odpovedovati.
        {when ? ` Prikazano je stanje z dne ${when}.` : ''}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
    marginBottom: Spacing.two,
  },
});
