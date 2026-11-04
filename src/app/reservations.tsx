import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { HeroEmpty, HeroPrimaryButton, HeroScreen, heroStyles } from '@/components/hero-screen';
import { OfflineBanner } from '@/components/offline-banner';
import { ReservationCard } from '@/components/reservation-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useMyReservations } from '@/hooks/use-my-reservations';
import { useTheme } from '@/hooks/use-theme';
import { parseDate } from '@/lib/dates';
import { useSession } from '@/lib/session';
import type { Reservation } from '@/lib/types';

/** »Imaš 3 prihajajoče ure« — ednina, dvojina, množina in rodilnik. */
function upcomingTitle(n: number): string {
  if (n === 0) return 'Ni prihajajočih ur';
  const r = n % 100;
  if (r === 1) return `Imaš ${n} prihajajočo uro`;
  if (r === 2) return `Imaš ${n} prihajajoči uri`;
  if (r === 3 || r === 4) return `Imaš ${n} prihajajoče ure`;
  return `Imaš ${n} prihajajočih ur`;
}

/** Rezervacije po mesecih (seznam s strežnika je že urejen po datumu). */
function groupByMonth(items: Reservation[]): { label: string; items: Reservation[] }[] {
  const groups: { label: string; items: Reservation[] }[] = [];
  for (const r of items) {
    const label = parseDate(r.date).toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' });
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(r);
    else groups.push({ label, items: [r] });
  }
  return groups;
}

/** Vse moje prihajajoče rezervacije v slogu »Domov« (z »Domov« → Prihajajoče → Prikaži vse). */
export default function MyReservationsScreen() {
  const theme = useTheme();
  const { user } = useSession();
  const { items, savedAt, fromCache, error, loading, refreshing, refresh } = useMyReservations();
  const canBook = !!user?.permissions?.reservations_create;
  const list = items ?? [];

  return (
    <HeroScreen
      overline="Moje rezervacije"
      title={items === null ? 'Moje rezervacije' : upcomingTitle(list.length)}
      back="/"
      refreshing={refreshing}
      onRefresh={refresh}>
      <OfflineBanner savedAt={fromCache ? savedAt : null} />

      {loading ? (
        <ActivityIndicator color={theme.primary} style={styles.loading} />
      ) : list.length === 0 ? (
        <HeroEmpty
          icon={{ ios: 'calendar', md: 'calendar_month' }}
          title={error ? 'Napaka pri nalaganju' : items === null ? 'Rezervacije še niso prenesene' : 'Še nimaš rezervacij'}
          text={error ?? 'Izberi prost termin in ga rezerviraj v nekaj dotikih.'}
          action={canBook ? { title: 'Poišči termin', onPress: () => router.navigate('/calendar') } : undefined}
        />
      ) : (
        <>
          {groupByMonth(list).map((group, gi) => (
            <View key={group.label} style={styles.section}>
              <ThemedText style={[heroStyles.label, heroStyles.sectionLabel, { color: theme.primary }]}>
                {group.label}
              </ThemedText>
              {group.items.map((r, i) => (
                <ReservationCard key={r.id} reservation={r} highlight={gi === 0 && i === 0} />
              ))}
            </View>
          ))}

          {canBook && (
            <HeroPrimaryButton
              title="Rezerviraj novo uro"
              icon={{ ios: 'calendar.badge.plus', md: 'calendar_add_on' }}
              onPress={() => router.navigate('/calendar')}
            />
          )}
        </>
      )}
    </HeroScreen>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: Spacing.five },
  section: { gap: 10 },
});
