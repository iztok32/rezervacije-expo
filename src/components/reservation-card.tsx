import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { HeroTile, heroStyles } from '@/components/hero-screen';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, errorMessage } from '@/lib/api';
import { useConnectivity } from '@/lib/connectivity';
import { emitDataChanged } from '@/lib/data-version';
import { formatDate, parseDate } from '@/lib/dates';
import { confirmAction, showMessage } from '@/lib/dialogs';
import { useSession } from '@/lib/session';
import type { Reservation } from '@/lib/types';

/**
 * Moja rezervacija kot ploščica v slogu »Domov«: datum v rdečem kvadratu, termin, učitelj in konj.
 * Odpoved oziroma prošnja za pozno odpoved samo s povezavo. highlight: naslednja ura (poln rdeč kvadrat).
 */
export function ReservationCard({ reservation: r, highlight = false }: { reservation: Reservation; highlight?: boolean }) {
  const { user } = useSession();
  const { isOnline } = useConnectivity();
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const title = r.appointment?.name ?? 'Termin';
  const when = formatDate(r.date, { weekday: 'long', day: 'numeric', month: 'long' });
  const start = r.appointment?.start_time;
  const end = r.appointment?.end_time;
  const teachers = r.appointment?.teachers ?? [];

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

  const canCancel = isOnline && !!user?.permissions?.reservations_delete && r.can_cancel;
  const canAskLate = isOnline && !r.can_cancel && !r.late_cancellation_requested;
  const askedLate = !r.can_cancel && r.late_cancellation_requested;

  return (
    <HeroTile style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.dateSquare, { backgroundColor: highlight ? theme.primary : theme.primarySoft }]}>
          <ThemedText style={[styles.dateWeekday, { color: highlight ? theme.onPrimary : theme.primary }]}>
            {formatDate(r.date, { weekday: 'short' }).replace('.', '').toUpperCase()}
          </ThemedText>
          <ThemedText style={[styles.dateDay, { color: highlight ? theme.onPrimary : theme.primary }]}>
            {parseDate(r.date).getDate()}
          </ThemedText>
        </View>
        <View style={styles.details}>
          <ThemedText style={heroStyles.tileTitle} numberOfLines={2}>
            {title}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={[heroStyles.meta, styles.metaLine]}>
            {[start && (end ? `${start} – ${end}` : start), teachers.join(', ')].filter(Boolean).join(' · ') || when}
          </ThemedText>
          {r.horse && (
            <View style={[styles.chip, { backgroundColor: theme.goldSoft }]}>
              <ThemedText style={[styles.chipText, { color: theme.gold }]}>Konj: {r.horse.name}</ThemedText>
            </View>
          )}
        </View>
      </View>

      {r.notes && (
        <ThemedText themeColor="textSecondary" style={[heroStyles.body, styles.notes]}>
          {r.notes}
        </ThemedText>
      )}

      {/* Akcije samo s povezavo; brez nje je seznam le za ogled */}
      {(canCancel || canAskLate || askedLate) && (
        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          {askedLate ? (
            <View style={styles.status}>
              <Icon ios="clock" md="schedule" size={18} color={theme.textSecondary} />
              <ThemedText themeColor="textSecondary" style={heroStyles.meta}>
                Prošnja za pozno odpoved je poslana.
              </ThemedText>
            </View>
          ) : (
            <Pressable
              onPress={canCancel ? cancel : requestLateCancellation}
              disabled={busy}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.action,
                { backgroundColor: theme.backgroundSelected },
                (pressed || busy) && heroStyles.pressed,
              ]}>
              {busy ? (
                <ActivityIndicator color={theme.danger} />
              ) : (
                <>
                  <Icon
                    ios={canCancel ? 'xmark.circle' : 'envelope'}
                    md={canCancel ? 'cancel' : 'mail'}
                    size={18}
                    color={canCancel ? theme.danger : theme.text}
                  />
                  <ThemedText style={[styles.actionText, { color: canCancel ? theme.danger : theme.text }]}>
                    {canCancel ? 'Odpovej' : 'Prošnja za pozno odpoved'}
                  </ThemedText>
                </>
              )}
            </Pressable>
          )}
        </View>
      )}
    </HeroTile>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.three - Spacing.one },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  dateSquare: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dateWeekday: { fontSize: 10, lineHeight: 12, fontWeight: 700 },
  dateDay: { fontSize: 20, lineHeight: 22, fontWeight: 800 },
  details: { flex: 1, gap: 3, paddingTop: 2 },
  metaLine: { marginTop: 1 },
  chip: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: 8 },
  chipText: { fontSize: 12, lineHeight: 16, fontWeight: 700 },
  notes: { marginLeft: 70 },
  footer: { borderTopWidth: 1, paddingTop: Spacing.three - Spacing.one },
  action: {
    height: 44,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  actionText: { fontSize: 14, lineHeight: 18, fontWeight: 700 },
  status: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 32 },
});
