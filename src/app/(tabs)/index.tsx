import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { HeroCountTile, HeroScreen, NotificationsButton } from '@/components/hero-screen';
import { Icon } from '@/components/icon';
import { OfflineBanner } from '@/components/offline-banner';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useHome } from '@/hooks/use-home';
import { useMyReservations } from '@/hooks/use-my-reservations';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatDate, parseDate, toDateString } from '@/lib/dates';
import { useSession } from '@/lib/session';
import type { Reservation } from '@/lib/types';

// Tožilnik dneva: »v torek«, »v sredo« … (getDay: 0 = nedelja)
const ON_WEEKDAY = ['v nedeljo', 'v ponedeljek', 'v torek', 'v sredo', 'v četrtek', 'v petek', 'v soboto'];

/** Naslov v glavi: kdaj je naslednja ura. */
function nextLessonTitle(r: Reservation | undefined): string {
  if (!r) return 'Še nimaš rezervirane ure';
  const today = new Date();
  const time = r.appointment?.start_time ? ` ob ${r.appointment.start_time}` : '';
  if (r.date === toDateString(today)) return `Danes jahaš${time}`;
  if (r.date === toDateString(addDays(today, 1))) return `Jutri jahaš${time}`;
  const date = parseDate(r.date);
  // V prihodnjem tednu zadošča dan, kasneje še datum
  const day = date < addDays(today, 6) ? ON_WEEKDAY[date.getDay()] : `${ON_WEEKDAY[date.getDay()]}, ${date.getDate()}. ${date.getMonth() + 1}.,`;
  return `Naslednjič jahaš ${day}${time}`;
}

/** Domov (predlog C »Ploščice«): naslednja ura, kuponi, prihajajoče, nova rezervacija in novica kluba. */
export default function HomeScreen() {
  const { user } = useSession();
  const theme = useTheme();
  const { items, savedAt, fromCache, refreshing, refresh } = useMyReservations();
  const { home, reload } = useHome();
  const [newsOpen, setNewsOpen] = useState(false);

  const next = items?.[0];
  const upcoming = items?.length ?? home?.upcoming_count ?? 0;
  const unread = home?.unread_notifications ?? 0;
  const canBuy = !!user?.permissions?.purchase_view;
  const canBook = !!user?.permissions?.reservations_create;
  const firstName = user?.name.split(' ')[0] ?? '';

  function onRefresh() {
    refresh();
    reload();
  }

  return (
    <HeroScreen
      overline={`Živjo, ${firstName}`}
      title={nextLessonTitle(next)}
      actions={<NotificationsButton unread={unread} />}
      refreshing={refreshing}
      onRefresh={onRefresh}>
      <OfflineBanner savedAt={fromCache ? savedAt : null} />

      {next ? (
        <Pressable
          onPress={() => router.push('/reservations')}
          accessibilityRole="button"
          accessibilityHint="Odpre seznam mojih rezervacij"
          style={({ pressed }) => [styles.tile, styles.nextTile, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
          <View style={[styles.dateSquare, { backgroundColor: theme.primary }]}>
            <ThemedText style={[styles.dateWeekday, { color: theme.onPrimary }]}>
              {formatDate(next.date, { weekday: 'short' }).replace('.', '').toUpperCase()}
            </ThemedText>
            <ThemedText style={[styles.dateDay, { color: theme.onPrimary }]}>{parseDate(next.date).getDate()}</ThemedText>
          </View>
          <View style={styles.flex}>
            <ThemedText style={styles.nextName} numberOfLines={1}>
              {next.appointment?.name ?? 'Termin'}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.nextMeta} numberOfLines={2}>
              {[
                next.appointment?.start_time &&
                  `${next.appointment.start_time}${next.appointment.end_time ? ` – ${next.appointment.end_time}` : ''}`,
                ...(next.appointment?.teachers ?? []),
                next.horse?.name,
              ]
                .filter(Boolean)
                .join(' · ')}
            </ThemedText>
          </View>
        </Pressable>
      ) : (
        <View style={[styles.tile, styles.empty, { backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}>
            <Icon ios="calendar" md="calendar_month" size={32} color={theme.primary} />
          </View>
          <ThemedText style={styles.emptyTitle}>Še nimaš rezervacij</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.emptyText}>
            Izberi prost termin in ga rezerviraj v nekaj dotikih.
          </ThemedText>
          {canBook && (
            <Pressable
              onPress={() => router.navigate('/calendar')}
              accessibilityRole="button"
              style={({ pressed }) => [styles.bigButton, styles.emptyButton, { backgroundColor: pressed ? theme.primaryPressed : theme.primary }]}>
              <ThemedText style={[styles.bigButtonText, { color: theme.onPrimary }]}>Poišči termin</ThemedText>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.tileRow}>
        <HeroCountTile
          label="Kuponi"
          value={home ? home.coupons_available : '–'}
          link={canBuy ? 'Kupi več' : 'Podrobnosti'}
          onPress={() => router.navigate('/coupons')}
          onLink={canBuy ? () => router.push('/purchase') : () => router.navigate('/coupons')}
        />
        <HeroCountTile
          label="Prihajajoče"
          value={upcoming}
          link="Prikaži vse"
          onPress={() => router.push('/reservations')}
          onLink={() => router.push('/reservations')}
        />
      </View>

      {canBook && next && (
        <Pressable
          onPress={() => router.navigate('/calendar')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.bigButton, { backgroundColor: pressed ? theme.primaryPressed : theme.primary }]}>
          <Icon ios="calendar.badge.plus" md="calendar_add_on" size={20} color={theme.onPrimary} />
          <ThemedText style={[styles.bigButtonText, { color: theme.onPrimary }]}>Rezerviraj novo uro</ThemedText>
        </Pressable>
      )}

      {home?.news && (
        <Pressable
          onPress={() => setNewsOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityState={{ expanded: newsOpen }}
          style={[styles.tile, styles.news, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText style={[styles.newsLabel, { color: theme.primary }]}>Novica kluba</ThemedText>
          <ThemedText style={styles.newsTitle}>{home.news.title}</ThemedText>
          {home.news.text !== '' && (
            <ThemedText themeColor="textSecondary" style={styles.newsText} numberOfLines={newsOpen ? undefined : 3}>
              {home.news.text}
            </ThemedText>
          )}
        </Pressable>
      )}
    </HeroScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
  tile: { borderRadius: 20, padding: Spacing.three },
  nextTile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  dateSquare: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dateWeekday: { fontSize: 10, lineHeight: 12, fontWeight: 700 },
  dateDay: { fontSize: 20, lineHeight: 22, fontWeight: 800 },
  nextName: { fontSize: 15, lineHeight: 20, fontWeight: 800 },
  nextMeta: { marginTop: 3, fontSize: 12, lineHeight: 16, fontWeight: 600 },
  tileRow: { flexDirection: 'row', gap: 12 },
  bigButton: {
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  bigButtonText: { fontSize: 16, lineHeight: 20, fontWeight: 700 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: Spacing.five, paddingHorizontal: Spacing.four, borderRadius: 24 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { marginTop: Spacing.one, fontSize: 18, lineHeight: 24, fontWeight: 800 },
  emptyText: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  emptyButton: { alignSelf: 'stretch', height: 52, borderRadius: 16, marginTop: Spacing.two },
  news: { gap: 6 },
  newsLabel: { fontSize: 12, lineHeight: 16, fontWeight: 700, letterSpacing: 0.7, textTransform: 'uppercase' },
  newsTitle: { fontSize: 15, lineHeight: 20, fontWeight: 700 },
  newsText: { fontSize: 13, lineHeight: 19 },
});
