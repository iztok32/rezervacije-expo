import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { CalendarPicker, shiftSelected, visibleRange, type CalendarView } from '@/components/calendar-picker';

import { DayHorsesSheet } from '@/components/day-horses-sheet';
import {
  HeroEmpty,
  HeroScreen,
  HeroTile,
  heroStyles,
  NotificationsButton,
  type IconName,
} from '@/components/hero-screen';
import { Icon } from '@/components/icon';
import { NotifySheet } from '@/components/notify-sheet';
import { OfflineBanner } from '@/components/offline-banner';
import { SlotSheet } from '@/components/slot-sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useApi } from '@/hooks/use-api';
import { useHome } from '@/hooks/use-home';
import { useTheme } from '@/hooks/use-theme';
import { useConnectivity } from '@/lib/connectivity';
import { formatDate, toDateString } from '@/lib/dates';
import type { OccupancyResponse, OccupancySlot } from '@/lib/types';

// Izbrani pogled (teden ali mesec) ostane na napravi tudi po odjavi, kot izbira teme
const VIEW_KEY = 'pref:calendarView';

/** »Sobota, 14. november« za naslov glave. */
function dayTitle(date: string): string {
  const text = formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** »3 termini« — ednina, dvojina, množina in rodilnik. */
function slotsLabel(n: number): string {
  const r = n % 100;
  const word = r === 1 ? 'termin' : r === 2 ? 'termina' : r === 3 || r === 4 ? 'termini' : 'terminov';
  return `${n} ${word}`;
}

/** Termini v slogu »Domov«: tedenski trak ali mesečni koledar v temni glavi, termini dneva kot ploščice. */
export default function CalendarScreen() {
  const theme = useTheme();
  const { isOnline, recheck } = useConnectivity();
  const { home } = useHome();
  const [view, setView] = useState<CalendarView>('week');
  const [selected, setSelected] = useState(() => toDateString(new Date()));
  const [openSlotId, setOpenSlotId] = useState<number | null>(null);
  const [dayHorsesOpen, setDayHorsesOpen] = useState(false);
  const [dayNotifyOpen, setDayNotifyOpen] = useState(false);
  const { start, end } = visibleRange(view, selected);

  useEffect(() => {
    AsyncStorage.getItem(VIEW_KEY).then(
      (v) => {
        if (v === 'week' || v === 'month') setView(v);
      },
      () => {},
    );
  }, []);

  function toggleView() {
    const next = view === 'week' ? 'month' : 'week';
    setView(next);
    AsyncStorage.setItem(VIEW_KEY, next).catch(() => {});
  }

  // Termini so na voljo samo s povezavo; brez nje aplikacija pokaže le lastne rezervacije
  const { data, error, loading, refreshing, refresh } = useApi<OccupancyResponse>(
    isOnline ? `/occupancy?start=${start}&end=${end}` : null,
  );

  const day = data?.days.find((d) => d.date === selected);
  // Odprti termin beremo iz zadnjih podatkov, da podokno po akciji pokaže novo stanje
  const openSlot = day?.slots.find((s) => s.appointment_id === openSlotId) ?? null;
  // Število rezervacij dneva (za »Konji za dan« in obvestilo vsem na ta dan)
  const dayBooked = day?.slots.reduce((n, s) => n + s.booked, 0) ?? 0;
  const caps = data?.capabilities;

  const dayPicker = isOnline ? (
    <CalendarPicker
      view={view}
      selected={selected}
      days={data?.days}
      onSelect={setSelected}
      onShift={(dir) => setSelected(shiftSelected(view, selected, dir))}
      onToggleView={toggleView}
    />
  ) : undefined;

  return (
    <>
      <HeroScreen
        compact
        title={isOnline ? dayTitle(selected) : 'Termini niso na voljo'}
        actions={<NotificationsButton unread={home?.unread_notifications ?? 0} />}
        headerExtra={dayPicker}
        refreshing={refreshing}
        onRefresh={isOnline ? refresh : () => recheck()}>
        <OfflineBanner />

        {!isOnline ? (
          <HeroEmpty
            icon={{ ios: 'wifi.slash', md: 'wifi_off' }}
            title="Brez povezave"
            text="Termini in oddaja rezervacij so na voljo samo s povezavo. Svoje rezervacije vidiš tudi brez nje."
            action={{ title: 'Moje rezervacije', onPress: () => router.push('/reservations') }}
          />
        ) : (
          <>
            {day?.holiday && (
              <HeroTile style={styles.holiday}>
                <Icon ios="sparkles" md="celebration" size={20} color={theme.gold} />
                <ThemedText style={[heroStyles.tileTitle, styles.flex]}>{day.holiday}</ThemedText>
              </HeroTile>
            )}

            {dayBooked > 0 && (caps?.assign_horses || caps?.notify_day) && (
              <View style={heroStyles.row}>
                {caps?.assign_horses && (
                  <ActionTile icon={{ ios: 'figure.equestrian.sports', md: 'pets' }} label="Konji za dan" onPress={() => setDayHorsesOpen(true)} />
                )}
                {caps?.notify_day && (
                  <ActionTile icon={{ ios: 'envelope', md: 'mail' }} label="Obvesti dan" onPress={() => setDayNotifyOpen(true)} />
                )}
              </View>
            )}

            {loading && !data ? (
              <ActivityIndicator color={theme.primary} style={styles.loading} />
            ) : error && !data ? (
              <HeroEmpty icon={{ ios: 'calendar', md: 'calendar_month' }} title="Napaka pri nalaganju" text={error} />
            ) : !day || day.slots.length === 0 ? (
              <HeroEmpty
                icon={{ ios: 'calendar', md: 'calendar_month' }}
                title="Ta dan ni terminov"
                text="Izberi drug dan zgoraj ali se premakni naprej s puščico."
              />
            ) : (
              <View style={styles.section}>
                <ThemedText style={[heroStyles.label, heroStyles.sectionLabel, { color: theme.primary }]}>
                  {slotsLabel(day.slots.length)}
                </ThemedText>
                {day.slots.map((slot) => (
                  <SlotTile
                    key={slot.appointment_id}
                    slot={slot}
                    showMissingHorses={!!caps?.assign_horses}
                    onPress={() => setOpenSlotId(slot.appointment_id)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </HeroScreen>

      {openSlot && data && (
        <SlotSheet
          key={`${openSlot.appointment_id}|${selected}`}
          slot={openSlot}
          date={selected}
          calendar={data}
          onClose={() => setOpenSlotId(null)}
        />
      )}

      {dayHorsesOpen && day && data && (
        <DayHorsesSheet day={day} calendar={data} onClose={() => setDayHorsesOpen(false)} />
      )}

      {dayNotifyOpen && day && (
        <NotifySheet
          target={{ kind: 'day', date: day.date, recipients: dayBooked }}
          channels={caps?.notify_channels ?? ['portal']}
          onClose={() => setDayNotifyOpen(false)}
        />
      )}
    </>
  );
}

/** Manjša ploščica z akcijo za upravljavce (konji, obvestilo dneva). */
function ActionTile({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [heroStyles.tile, styles.actionTile, { backgroundColor: theme.backgroundElement }, pressed && heroStyles.pressed]}>
      <View style={[styles.actionIcon, { backgroundColor: theme.primarySoft }]}>
        <Icon ios={icon.ios} md={icon.md} size={18} color={theme.primary} />
      </View>
      <ThemedText style={[styles.actionText, { color: theme.text }]} numberOfLines={1}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

type Tone = 'primary' | 'success' | 'danger' | 'textSecondary';

/** Kratko stanje termina za seznam; podrobnosti in akcije so v SlotSheet. */
function slotStatus(slot: OccupancySlot): { label: string; tone: Tone } {
  if (slot.is_mine) return { label: 'Tvoja rezervacija', tone: 'primary' };
  if (slot.is_full) {
    if (slot.waiting_list.entry_id) return { label: `Čakalna vrsta #${slot.waiting_list.position}`, tone: 'danger' };
    return { label: slot.waiting_list.can_join ? 'Polno · čakalna vrsta' : 'Polno', tone: 'danger' };
  }
  if (slot.restriction) return { label: slot.is_open ? 'Prijava ni mogoča' : 'Zaklenjeno', tone: 'textSecondary' };
  return { label: slot.available !== null ? `Prostih: ${slot.available}` : 'Prosto', tone: 'success' };
}

function SlotTile({
  slot,
  showMissingHorses,
  onPress,
}: {
  slot: OccupancySlot;
  showMissingHorses: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const ratio = slot.capacity ? Math.min(1, slot.booked / slot.capacity) : 0;
  const status = slotStatus(slot);
  const accent = theme[status.tone];
  const soft = { primary: theme.primarySoft, success: theme.successSoft, danger: theme.primarySoft, textSecondary: theme.backgroundSelected }[
    status.tone
  ];
  const withoutHorse = showMissingHorses ? slot.participants.filter((p) => !p.horse).length : 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${slot.start_time ?? ''} ${slot.name}, ${status.label}`}
      accessibilityHint="Odpre podrobnosti termina"
      style={({ pressed }) => pressed && heroStyles.pressed}>
      <HeroTile style={[styles.slot, slot.is_mine && { borderColor: theme.primary }]}>
        <View style={[styles.timeBox, { backgroundColor: slot.is_mine ? theme.primary : theme.backgroundSelected }]}>
          <ThemedText style={[styles.timeStart, { color: slot.is_mine ? theme.onPrimary : theme.text }]}>
            {slot.start_time ?? '—'}
          </ThemedText>
          {slot.end_time && (
            <ThemedText style={[styles.timeEnd, { color: slot.is_mine ? theme.onPrimary : theme.textSecondary }]}>
              {slot.end_time}
            </ThemedText>
          )}
        </View>
        <View style={styles.slotBody}>
          <ThemedText style={heroStyles.tileTitle} numberOfLines={2}>
            {slot.name}
          </ThemedText>

          {slot.capacity ? (
            <View style={[styles.bar, { backgroundColor: theme.backgroundSelected }]}>
              <View style={[styles.barFill, { width: `${ratio * 100}%`, backgroundColor: slot.is_full ? theme.danger : theme.success }]} />
            </View>
          ) : null}

          <View style={styles.slotRow}>
            <ThemedText themeColor="textSecondary" style={[heroStyles.meta, styles.flex]}>
              {slot.capacity ? `${slot.booked}/${slot.capacity}` : `Rezervacij: ${slot.booked}`}
              {withoutHorse > 0 && (
                <ThemedText style={[heroStyles.meta, { color: theme.warning }]}>{` · brez konja: ${withoutHorse}`}</ThemedText>
              )}
            </ThemedText>
            <View style={[styles.pill, { backgroundColor: soft }]}>
              <ThemedText style={[styles.pillText, { color: accent }]}>{status.label}</ThemedText>
            </View>
          </View>
        </View>
        <Icon ios="chevron.right" md="chevron_right" size={18} color={theme.textSecondary} />
      </HeroTile>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { paddingVertical: Spacing.five },
  holiday: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three - Spacing.one },
  actionTile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.three - Spacing.one },
  actionIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionText: { flex: 1, fontSize: 14, lineHeight: 18, fontWeight: 700 },
  section: { gap: 10 },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 2, borderColor: 'transparent' },
  timeBox: { width: 60, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  timeStart: { fontSize: 16, lineHeight: 20, fontWeight: 800 },
  timeEnd: { fontSize: 11, lineHeight: 14, fontWeight: 600 },
  slotBody: { flex: 1, gap: Spacing.one },
  slotRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden', marginVertical: 2 },
  barFill: { height: '100%', borderRadius: 3 },
  pill: { paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: 8 },
  pillText: { fontSize: 11, lineHeight: 16, fontWeight: 700 },
});
