import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { DayHorsesSheet } from '@/components/day-horses-sheet';
import { OfflineBanner } from '@/components/offline-banner';
import { CenteredState, ScreenHeader, screenStyles, useContentPadding } from '@/components/screen';
import { SlotSheet } from '@/components/slot-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useApi } from '@/hooks/use-api';
import { useTheme } from '@/hooks/use-theme';
import { useConnectivity } from '@/lib/connectivity';
import { addDays, formatDate, formatTimeRange, parseDate, toDateString } from '@/lib/dates';
import type { OccupancyResponse, OccupancySlot } from '@/lib/types';

const RANGE_DAYS = 14;

export default function CalendarScreen() {
  const padding = useContentPadding();
  const { isOnline, recheck } = useConnectivity();
  const [start, setStart] = useState(() => toDateString(new Date()));
  const [selected, setSelected] = useState(start);
  const [openSlotId, setOpenSlotId] = useState<number | null>(null);
  const [dayHorsesOpen, setDayHorsesOpen] = useState(false);
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
              {data?.capabilities?.assign_horses && day?.slots.some((s) => s.participants.length > 0) && (
                <Pressable onPress={() => setDayHorsesOpen(true)} hitSlop={8} accessibilityRole="button">
                  <ThemedText type="linkPrimary">Konji za dan ›</ThemedText>
                </Pressable>
              )}
            </View>

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
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }}>
      <ThemedView type={selected ? 'backgroundSelected' : 'backgroundElement'} style={styles.chip}>
        <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
          {formatDate(date, { weekday: 'short' })}
        </ThemedText>
        <ThemedText type="smallBold">{parseDate(date).getDate()}</ThemedText>
        <View style={[styles.dot, { backgroundColor: hasMine ? theme.primary : 'transparent' }]} />
      </ThemedView>
    </Pressable>
  );
}

/** Kratko stanje termina za seznam; podrobnosti in akcije so v SlotSheet. */
function slotStatus(slot: OccupancySlot): { label: string; tone: 'primary' | 'success' | 'danger' | 'textSecondary' } {
  if (slot.is_mine) return { label: 'Tvoja rezervacija', tone: 'primary' };
  if (slot.is_full) {
    if (slot.waiting_list.entry_id) return { label: `Polno · v čakalni vrsti #${slot.waiting_list.position}`, tone: 'danger' };
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
  const barColor = slot.is_full ? theme.danger : theme.success;
  const status = slotStatus(slot);
  const withoutHorse = showMissingHorses ? slot.participants.filter((p) => !p.horse).length : 0;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityHint="Odpre podrobnosti termina">
      {({ pressed }) => (
        <ThemedView
          type="backgroundElement"
          style={[
            screenStyles.card,
            slot.is_mine && { borderWidth: 2, borderColor: theme.primary },
            pressed && { opacity: 0.7 },
          ]}>
          <View style={styles.slotRow}>
            <ThemedText type="smallBold" style={styles.slotName}>
              {slot.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatTimeRange(slot.start_time, slot.end_time)}
            </ThemedText>
          </View>

          {slot.capacity ? (
            <View style={[styles.bar, { backgroundColor: theme.backgroundSelected }]}>
              <View style={[styles.barFill, { width: `${ratio * 100}%`, backgroundColor: barColor }]} />
            </View>
          ) : null}

          <View style={styles.slotRow}>
            <ThemedText type="small" themeColor="textSecondary">
              {slot.capacity ? `Zasedeno ${slot.booked}/${slot.capacity}` : `Rezervacij: ${slot.booked}`}
              {withoutHorse > 0 && (
                <ThemedText type="small" style={{ color: theme.warning }}>
                  {` · brez konja: ${withoutHorse}`}
                </ThemedText>
              )}
            </ThemedText>
            <ThemedText type="smallBold" style={{ color: theme[status.tone] }}>
              {status.label}
            </ThemedText>
          </View>
        </ThemedView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  rangeNav: { flexDirection: 'row', gap: Spacing.three },
  days: { gap: Spacing.two, paddingVertical: Spacing.one },
  chip: {
    width: 52,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: Spacing.half },
  flex: { flex: 1 },
  dayTitle: { marginTop: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  slotRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  slotName: { flex: 1 },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden', marginVertical: Spacing.one },
  barFill: { height: '100%', borderRadius: 3 },
});
