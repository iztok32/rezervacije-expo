import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { DayHorsesSheet } from '@/components/day-horses-sheet';
import { NotifySheet } from '@/components/notify-sheet';
import { OfflineBanner } from '@/components/offline-banner';
import { CenteredState, ScreenHeader, screenStyles, useContentPadding } from '@/components/screen';
import { SlotSheet } from '@/components/slot-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CardShadow, Radius, Spacing } from '@/constants/theme';
import { useApi } from '@/hooks/use-api';
import { useTheme } from '@/hooks/use-theme';
import { useConnectivity } from '@/lib/connectivity';
import { addDays, formatDate, parseDate, toDateString } from '@/lib/dates';
import type { OccupancyResponse, OccupancySlot } from '@/lib/types';

const RANGE_DAYS = 14;

export default function CalendarScreen() {
  const padding = useContentPadding();
  const { isOnline, recheck } = useConnectivity();
  const [start, setStart] = useState(() => toDateString(new Date()));
  const [selected, setSelected] = useState(start);
  const [openSlotId, setOpenSlotId] = useState<number | null>(null);
  const [dayHorsesOpen, setDayHorsesOpen] = useState(false);
  const [dayNotifyOpen, setDayNotifyOpen] = useState(false);
  const end = toDateString(addDays(parseDate(start), RANGE_DAYS - 1));

  // Termini so na voljo samo s povezavo; brez nje aplikacija pokaže le lastne rezervacije
  const { data, error, loading, refreshing, refresh } = useApi<OccupancyResponse>(
    isOnline ? `/occupancy?start=${start}&end=${end}` : null,
  );

  function shiftRange(days: number) {
    const next = toDateString(addDays(parseDate(start), days));
    setStart(next);
    setSelected(next);
  }

  const day = data?.days.find((d) => d.date === selected);
  // Odprti termin beremo iz zadnjih podatkov, da podokno po akciji pokaže novo stanje
  const openSlot = day?.slots.find((s) => s.appointment_id === openSlotId) ?? null;
  // Število rezervacij dneva (za »Konji za dan« in obvestilo vsem na ta dan)
  const dayBooked = day?.slots.reduce((n, s) => n + s.booked, 0) ?? 0;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[screenStyles.content, padding]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={isOnline ? refresh : () => recheck()} />
        }>
        <ScreenHeader
          title="Termini"
          right={
            isOnline && (
              <View style={styles.rangeNav}>
                <Pressable onPress={() => shiftRange(-RANGE_DAYS)} hitSlop={8} accessibilityRole="button">
                  <ThemedText type="linkPrimary">‹ Prej</ThemedText>
                </Pressable>
                <Pressable onPress={() => shiftRange(RANGE_DAYS)} hitSlop={8} accessibilityRole="button">
                  <ThemedText type="linkPrimary">Naprej ›</ThemedText>
                </Pressable>
              </View>
            )
          }
        />

        <OfflineBanner />

        {!isOnline ? (
          <CenteredState message="Termini in oddaja rezervacij so na voljo samo s povezavo. Svoje rezervacije vidiš pod »Moje rezervacije«." />
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
              {Array.from({ length: RANGE_DAYS }, (_, i) => toDateString(addDays(parseDate(start), i))).map(
                (date) => (
                  <DayChip
                    key={date}
                    date={date}
                    selected={date === selected}
                    hasMine={!!data?.days.find((d) => d.date === date)?.slots.some((s) => s.is_mine)}
                    onPress={() => setSelected(date)}
                  />
                ),
              )}
            </ScrollView>

            <View style={styles.dayTitle}>
              <ThemedText type="smallBold" style={styles.flex}>
                {formatDate(selected, { weekday: 'long', day: 'numeric', month: 'long' })}
                {day?.holiday ? ` · ${day.holiday}` : ''}
              </ThemedText>
            </View>
            {dayBooked > 0 && (data?.capabilities?.assign_horses || data?.capabilities?.notify_day) && (
              <View style={styles.dayActions}>
                {data?.capabilities?.assign_horses && (
                  <Pressable onPress={() => setDayHorsesOpen(true)} hitSlop={8} accessibilityRole="button">
                    <ThemedText type="linkPrimary">Konji za dan ›</ThemedText>
                  </Pressable>
                )}
                {data?.capabilities?.notify_day && (
                  <Pressable onPress={() => setDayNotifyOpen(true)} hitSlop={8} accessibilityRole="button">
                    <ThemedText type="linkPrimary">✉ Obvesti dan ›</ThemedText>
                  </Pressable>
                )}
              </View>
            )}

            {loading || error || !day || day.slots.length === 0 ? (
              <CenteredState
                loading={loading}
                message={loading ? undefined : (error ?? 'Ta dan ni terminov.')}
              />
            ) : (
              day.slots.map((slot) => (
                <SlotCard
                  key={slot.appointment_id}
                  slot={slot}
                  showMissingHorses={!!data?.capabilities?.assign_horses}
                  onPress={() => setOpenSlotId(slot.appointment_id)}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

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
          channels={data?.capabilities?.notify_channels ?? ['portal']}
          onClose={() => setDayNotifyOpen(false)}
        />
      )}
    </ThemedView>
  );
}

function DayChip({
  date,
  selected,
  hasMine,
  onPress,
}: {
  date: string;
  selected: boolean;
  hasMine: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const today = date === toDateString(new Date());
  const fg = selected ? theme.onPrimary : theme.text;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}>
      <View
        style={[
          styles.chip,
          { backgroundColor: selected ? theme.primary : theme.backgroundElement, borderColor: today && !selected ? theme.primary : 'transparent' },
        ]}>
        <ThemedText type="overline" style={[styles.chipWeekday, { color: selected ? theme.onPrimary : theme.textSecondary }]}>
          {formatDate(date, { weekday: 'short' }).replace('.', '')}
        </ThemedText>
        <ThemedText style={[styles.chipDay, { color: fg }]}>{parseDate(date).getDate()}</ThemedText>
        <View style={[styles.dot, { backgroundColor: hasMine ? (selected ? theme.onPrimary : theme.primary) : 'transparent' }]} />
      </View>
    </Pressable>
  );
}

type Tone = 'primary' | 'success' | 'danger' | 'textSecondary';

/** Kratko stanje termina za seznam; podrobnosti in akcije so v SlotSheet. */
function slotStatus(slot: OccupancySlot): { label: string; tone: Tone } {
  if (slot.is_mine) return { label: 'Tvoja rezervacija', tone: 'primary' };
  if (slot.is_full) {
    if (slot.waiting_list.entry_id) return { label: `Polno · čakalna vrsta #${slot.waiting_list.position}`, tone: 'danger' };
    return { label: slot.waiting_list.can_join ? 'Polno · čakalna vrsta' : 'Polno', tone: 'danger' };
  }
  if (slot.restriction) return { label: slot.is_open ? 'Prijava ni mogoča' : 'Zaklenjeno', tone: 'textSecondary' };
  return { label: slot.available !== null ? `Prostih: ${slot.available}` : 'Prosto', tone: 'success' };
}

function SlotCard({
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
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityHint="Odpre podrobnosti termina">
      {({ pressed }) => (
        <ThemedView
          type="backgroundElement"
          style={[screenStyles.card, styles.slotCard, slot.is_mine && { borderColor: theme.primary }, pressed && { opacity: 0.75 }]}>
          <View style={[styles.slotAccent, { backgroundColor: accent }]} />
          <View style={styles.slotTime}>
            <ThemedText style={styles.slotStart}>{slot.start_time ?? '—'}</ThemedText>
            {slot.end_time && (
              <ThemedText type="small" themeColor="textSecondary">
                {slot.end_time}
              </ThemedText>
            )}
          </View>
          <View style={styles.slotBody}>
            <ThemedText type="smallBold" numberOfLines={2}>
              {slot.name}
            </ThemedText>

            {slot.capacity ? (
              <View style={[styles.bar, { backgroundColor: theme.backgroundSelected }]}>
                <View style={[styles.barFill, { width: `${ratio * 100}%`, backgroundColor: slot.is_full ? theme.danger : theme.success }]} />
              </View>
            ) : null}

            <View style={styles.slotRow}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
                {slot.capacity ? `${slot.booked}/${slot.capacity}` : `Rezervacij: ${slot.booked}`}
                {withoutHorse > 0 && (
                  <ThemedText type="small" style={{ color: theme.warning, fontWeight: 700 }}>
                    {` · brez konja: ${withoutHorse}`}
                  </ThemedText>
                )}
              </ThemedText>
              <View style={[styles.pill, { backgroundColor: soft }]}>
                <ThemedText type="small" style={[styles.pillText, { color: accent }]}>
                  {status.label}
                </ThemedText>
              </View>
            </View>
          </View>
        </ThemedView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  rangeNav: { flexDirection: 'row', gap: Spacing.three },
  days: { gap: Spacing.two, paddingVertical: Spacing.two, paddingHorizontal: Spacing.half },
  chip: {
    width: 54,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 1.5,
    alignItems: 'center',
    boxShadow: CardShadow,
  },
  chipWeekday: { fontSize: 11, letterSpacing: 0.8 },
  chipDay: { fontSize: 20, lineHeight: 24, fontWeight: 800 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: Spacing.half },
  flex: { flex: 1 },
  dayTitle: { marginTop: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dayActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingLeft: Spacing.three + Spacing.one,
    borderWidth: 1.5,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  slotAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  slotTime: { width: 54, alignItems: 'flex-start' },
  slotStart: { fontSize: 18, lineHeight: 22, fontWeight: 800 },
  slotBody: { flex: 1, gap: Spacing.one },
  slotRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden', marginVertical: Spacing.one },
  barFill: { height: '100%', borderRadius: 3 },
  pill: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.half, borderRadius: Radius.small },
  pillText: { fontWeight: 700, fontSize: 12, lineHeight: 16 },
});
