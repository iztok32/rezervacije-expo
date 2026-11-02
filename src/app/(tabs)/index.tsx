import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { OfflineBanner } from '@/components/offline-banner';
import { CenteredState, ScreenHeader, screenStyles, useContentPadding } from '@/components/screen';
import { ThemeSwitch } from '@/components/theme-switch';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useMyReservations } from '@/hooks/use-my-reservations';
import { useTheme } from '@/hooks/use-theme';
import { api, errorMessage } from '@/lib/api';
import { useConnectivity } from '@/lib/connectivity';
import { emitDataChanged } from '@/lib/data-version';
import { formatDate, formatTimeRange } from '@/lib/dates';
import { confirmAction, showMessage } from '@/lib/dialogs';
import { useSession } from '@/lib/session';
import type { Reservation } from '@/lib/types';

export default function MyReservationsScreen() {
  const { user, signOut } = useSession();
  const padding = useContentPadding();
  const { items, savedAt, fromCache, error, loading, refreshing, refresh } = useMyReservations();

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={items ?? []}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={[screenStyles.content, padding]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListHeaderComponent={
          <>
            <ScreenHeader
              title="Moje rezervacije"
              right={
                <Pressable onPress={signOut} hitSlop={8} accessibilityRole="button">
                  <ThemedText type="linkPrimary">Odjava</ThemedText>
                </Pressable>
              }
            />
            <OfflineBanner savedAt={fromCache ? savedAt : null} />
          </>
        }
        ListEmptyComponent={
          <CenteredState
            loading={loading}
            message={
              loading
                ? undefined
                : (error ?? (items === null ? 'Rezervacije še niso bile prenesene.' : 'Nimaš prihajajočih rezervacij.'))
            }
          />
        }
        ListFooterComponent={
          <View style={styles.footerBox}>
            <ThemeSwitch />
            {user && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
                Uporabnik: {user.name}
              </ThemedText>
            )}
          </View>
        }
        renderItem={({ item }) => <ReservationCard reservation={item} />}
      />
    </ThemedView>
  );
}

function ReservationCard({ reservation: r }: { reservation: Reservation }) {
  const { user } = useSession();
  const { isOnline } = useConnectivity();
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const title = r.appointment?.name ?? 'Termin';
  const when = formatDate(r.date, { weekday: 'long', day: 'numeric', month: 'long' });

  async function run(call: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await call();
      showMessage(success);
      emitDataChanged();
    } catch (e) {
      showMessage('Ni uspelo', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (await confirmAction('Odpoved rezervacije', `${title}, ${when}`, 'Odpovej', true)) {
      run(() => api.delete(`/reservations/${r.id}`), 'Rezervacija je odpovedana.');
    }
  }

  async function requestLateCancellation() {
    const ok = await confirmAction(
      'Prošnja za pozno odpoved',
      'Rok za odpoved je potekel. Učitelju oziroma administratorju bo poslano obvestilo, da prosiš za odpoved.',
      'Pošlji',
    );
    if (ok) run(() => api.post(`/reservations/${r.id}/late-cancellation`), 'Prošnja za pozno odpoved je poslana.');
  }

  return (
    <ThemedView type="backgroundElement" style={[screenStyles.card, styles.card]}>
      <View style={styles.row}>
        {/* Datum kot na vstopnici: dan v tednu, številka dneva, mesec */}
        <View style={[styles.dateBox, { backgroundColor: theme.primarySoft }]}>
          <ThemedText type="overline" style={styles.dateWeekday}>
            {formatDate(r.date, { weekday: 'short' }).replace('.', '')}
          </ThemedText>
          <ThemedText style={[styles.dateDay, { color: theme.primary }]}>{formatDate(r.date, { day: 'numeric' }).replace('.', '')}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.dateMonth}>
            {formatDate(r.date, { month: 'short' }).replace('.', '')}
          </ThemedText>
        </View>
        <View style={styles.details}>
          <ThemedText style={styles.time}>
            {formatTimeRange(r.appointment?.start_time ?? null, r.appointment?.end_time ?? null) || '—'}
          </ThemedText>
          <ThemedText type="smallBold">{title}</ThemedText>
          {r.horse && (
            <View style={[styles.horseChip, { backgroundColor: theme.goldSoft }]}>
              <ThemedText type="small" style={{ color: theme.gold, fontWeight: 700 }}>
                Konj: {r.horse.name}
              </ThemedText>
            </View>
          )}
          {r.notes && (
            <ThemedText type="small" themeColor="textSecondary">
              {r.notes}
            </ThemedText>
          )}
        </View>
      </View>

      {/* Akcije samo s povezavo; brez nje je seznam le za ogled */}
      {isOnline && user?.permissions?.reservations_delete && r.can_cancel && (
        <Button title="Odpovej" variant="secondary" onPress={cancel} loading={busy} />
      )}
      {isOnline && !r.can_cancel && !r.late_cancellation_requested && (
        <Button title="Prošnja za pozno odpoved" variant="secondary" onPress={requestLateCancellation} loading={busy} />
      )}
      {!r.can_cancel && r.late_cancellation_requested && (
        <ThemedText type="small" themeColor="textSecondary">
          Prošnja za pozno odpoved je poslana.
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  dateBox: { width: 64, paddingVertical: Spacing.two, borderRadius: Radius.medium, alignItems: 'center' },
  dateWeekday: { letterSpacing: 1 },
  dateDay: { fontSize: 28, lineHeight: 32, fontWeight: 800 },
  dateMonth: { textTransform: 'uppercase', fontSize: 12, lineHeight: 14 },
  details: { flex: 1, gap: Spacing.one },
  time: { fontSize: 18, lineHeight: 22, fontWeight: 800 },
  horseChip: { alignSelf: 'flex-start', paddingHorizontal: Spacing.two, paddingVertical: Spacing.half, borderRadius: Radius.small },
  footerBox: { marginTop: Spacing.four, gap: Spacing.three },
  footer: { textAlign: 'center' },
});
