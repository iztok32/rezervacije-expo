import { Pressable, StyleSheet, View } from 'react-native';

import { HeroButton, heroStyles } from '@/components/hero-screen';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatDate, parseDate, toDateString } from '@/lib/dates';
import type { OccupancyDay } from '@/lib/types';

export type CalendarView = 'week' | 'month';

const WEEKDAYS = ['P', 'T', 'S', 'Č', 'P', 'S', 'N'];

/** Ponedeljek tedna, v katerem je datum. */
export function weekStart(date: string): string {
  const d = parseDate(date);
  return toDateString(addDays(d, -((d.getDay() + 6) % 7)));
}

/** Prvi in zadnji dan prikazanega obdobja (teden pon–ned ali cel mesec). */
export function visibleRange(view: CalendarView, selected: string): { start: string; end: string } {
  if (view === 'week') {
    const start = weekStart(selected);
    return { start, end: toDateString(addDays(parseDate(start), 6)) };
  }
  const d = parseDate(selected);
  return {
    start: toDateString(new Date(d.getFullYear(), d.getMonth(), 1)),
    end: toDateString(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
  };
}

/** Datum, ki ga izbere »‹ / ›«: teden ±7 dni, mesec prvi dan sosednjega meseca (ali danes). */
export function shiftSelected(view: CalendarView, selected: string, dir: -1 | 1): string {
  if (view === 'week') return toDateString(addDays(parseDate(selected), dir * 7));
  const d = parseDate(selected);
  const first = new Date(d.getFullYear(), d.getMonth() + dir, 1);
  const today = new Date();
  return first.getFullYear() === today.getFullYear() && first.getMonth() === today.getMonth()
    ? toDateString(today)
    : toDateString(first);
}

type DaySummary = { has: boolean; mine: boolean; full: boolean; free: number | null };

/** Stanje dneva za trak in mesec: ali ima termine, mojo uro, ali je vse polno in koliko je prostih mest. */
function summarize(day: OccupancyDay | undefined): DaySummary {
  const slots = day?.slots ?? [];
  const open = slots.filter((s) => !s.is_full && !s.restriction);
  return {
    has: slots.length > 0,
    mine: slots.some((s) => s.is_mine),
    full: slots.length > 0 && slots.every((s) => s.is_full),
    // null = prosto brez omejitve mest
    free: open.some((s) => s.available === null) ? null : open.reduce((n, s) => n + (s.available ?? 0), 0),
  };
}

/** Oznaka obdobja levo od gumbov: »9.–15. november« ali »November 2026«. */
function rangeLabel(view: CalendarView, selected: string): string {
  const { start, end } = visibleRange(view, selected);
  if (view === 'month') {
    const text = parseDate(start).toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' });
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  const s = parseDate(start);
  const e = parseDate(end);
  return s.getMonth() === e.getMonth()
    ? `${s.getDate()}.–${e.getDate()}. ${formatDate(end, { month: 'long' })}`
    : `${s.getDate()}. ${formatDate(start, { month: 'short' })} – ${e.getDate()}. ${formatDate(end, { month: 'short' })}`;
}

/**
 * Izbira dneva v temni glavi Terminov: tedenski trak (privzeto) ali mesečni koledar.
 * Preklop je ikona levo od gumbov za prejšnje / naslednje obdobje.
 */
export function CalendarPicker({
  view,
  selected,
  days,
  onSelect,
  onShift,
  onToggleView,
}: {
  view: CalendarView;
  selected: string;
  days: OccupancyDay[] | undefined;
  onSelect: (date: string) => void;
  onShift: (dir: -1 | 1) => void;
  onToggleView: () => void;
}) {
  const theme = useTheme();
  const byDate = new Map((days ?? []).map((d) => [d.date, d]));
  const period = view === 'week' ? 'teden' : 'mesec';

  return (
    <View style={styles.picker}>
      <View style={styles.navRow}>
        <ThemedText style={[styles.rangeLabel, { color: theme.heroMuted }]} numberOfLines={1}>
          {rangeLabel(view, selected)}
        </ThemedText>
        <HeroButton label={view === 'week' ? 'Prikaži mesečni koledar' : 'Prikaži tedenski trak'} onPress={onToggleView}>
          <Icon
            ios={view === 'week' ? 'calendar' : 'rectangle.split.3x1'}
            md={view === 'week' ? 'calendar_month' : 'view_week'}
            size={20}
            color={theme.heroText}
          />
        </HeroButton>
        <HeroButton label={`Prejšnji ${period}`} onPress={() => onShift(-1)}>
          <Icon ios="chevron.left" md="chevron_left" size={20} color={theme.heroText} />
        </HeroButton>
        <HeroButton label={`Naslednji ${period}`} onPress={() => onShift(1)}>
          <Icon ios="chevron.right" md="chevron_right" size={20} color={theme.heroText} />
        </HeroButton>
      </View>

      {view === 'week' ? (
        <WeekStrip selected={selected} byDate={byDate} onSelect={onSelect} />
      ) : (
        <MonthGrid selected={selected} byDate={byDate} onSelect={onSelect} />
      )}
    </View>
  );
}

function WeekStrip({
  selected,
  byDate,
  onSelect,
}: {
  selected: string;
  byDate: Map<string, OccupancyDay>;
  onSelect: (date: string) => void;
}) {
  const theme = useTheme();
  const start = parseDate(weekStart(selected));
  const today = toDateString(new Date());

  return (
    <>
      <View style={styles.week}>
        {Array.from({ length: 7 }, (_, i) => toDateString(addDays(start, i))).map((date) => {
          const isSelected = date === selected;
          const s = summarize(byDate.get(date));
          const note = !s.has ? '–' : s.mine ? 'moja' : s.full ? 'polno' : s.free === null ? 'prosto' : String(s.free);
          const noteColor = isSelected
            ? theme.onPrimary
            : !s.has
              ? theme.heroMuted
              : s.mine || s.full
                ? '#F2A0A4'
                : '#7FD19A';
          return (
            <Pressable
              key={date}
              onPress={() => onSelect(date)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}${
                !s.has ? ', ni terminov' : s.mine ? ', moja ura' : s.full ? ', polno' : s.free === null ? ', prosto' : `, prostih mest: ${s.free}`
              }`}
              style={({ pressed }) => [
                styles.weekDay,
                {
                  backgroundColor: isSelected ? theme.primary : theme.heroControl,
                  borderColor: date === today && !isSelected ? theme.heroText : 'transparent',
                },
                pressed && heroStyles.pressed,
              ]}>
              <ThemedText style={[styles.weekName, { color: isSelected ? theme.onPrimary : theme.heroMuted }]}>
                {formatDate(date, { weekday: 'short' }).replace('.', '').toUpperCase()}
              </ThemedText>
              <ThemedText style={[styles.weekNumber, { color: theme.heroText }]}>{parseDate(date).getDate()}</ThemedText>
              <ThemedText style={[styles.weekNote, { color: noteColor }]} numberOfLines={1}>
                {note}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      <ThemedText style={[styles.hint, { color: theme.heroMuted }]}>Število pod dnevom = prosta mesta</ThemedText>
    </>
  );
}

function MonthGrid({
  selected,
  byDate,
  onSelect,
}: {
  selected: string;
  byDate: Map<string, OccupancyDay>;
  onSelect: (date: string) => void;
}) {
  const theme = useTheme();
  const d = parseDate(selected);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const today = toDateString(new Date());
  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toDateString(new Date(d.getFullYear(), d.getMonth(), i + 1))),
  ];
  while (cells.length % 7) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7));
  const freeDot = '#7FD19A';
  const fullDot = '#8E8781';

  return (
    <>
      <View style={styles.monthRow}>
        {WEEKDAYS.map((w, i) => (
          <ThemedText key={i} style={[styles.monthHead, { color: theme.heroMuted }]}>
            {w}
          </ThemedText>
        ))}
      </View>
      {rows.map((row, r) => (
        <View key={r} style={styles.monthRow}>
          {row.map((date, i) => {
            if (!date) return <View key={i} style={styles.monthCell} />;
            const day = byDate.get(date);
            const s = summarize(day);
            const isSelected = date === selected;
            const dot = s.mine ? theme.notifyDot : s.full ? fullDot : s.has ? freeDot : null;
            return (
              <Pressable
                key={date}
                onPress={() => onSelect(date)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}${
                  day?.holiday ? `, ${day.holiday}` : ''
                }${!s.has ? '' : s.mine ? ', moja ura' : s.full ? ', polno' : ', prosti termini'}`}
                style={({ pressed }) => [
                  styles.monthCell,
                  styles.monthDay,
                  isSelected && { backgroundColor: theme.primary },
                  date === today && !isSelected && { borderColor: theme.heroText },
                  pressed && heroStyles.pressed,
                ]}>
                <ThemedText
                  style={[
                    styles.monthNumber,
                    { color: s.has || isSelected ? theme.heroText : theme.heroMuted },
                    isSelected && { fontWeight: 800 },
                  ]}>
                  {parseDate(date).getDate()}
                </ThemedText>
                {day?.holiday ? (
                  <ThemedText style={[styles.star, { color: isSelected ? theme.onPrimary : '#E5B85C' }]}>★</ThemedText>
                ) : (
                  <View style={[styles.dot, { backgroundColor: dot ? (isSelected ? theme.onPrimary : dot) : 'transparent' }]} />
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
      <View style={styles.legend}>
        <Legend color={freeDot} label="prosto" />
        <Legend color={fullDot} label="polno" />
        <Legend color={theme.notifyDot} label="moja ura" />
        <View style={styles.legendItem}>
          <ThemedText style={[styles.star, { color: '#E5B85C' }]}>★</ThemedText>
          <ThemedText style={[styles.legendText, { color: theme.heroMuted }]}>praznik</ThemedText>
        </View>
      </View>
    </>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <ThemedText style={[styles.legendText, { color: theme.heroMuted }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  picker: { gap: Spacing.three - Spacing.one },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  rangeLabel: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: 700 },
  week: { flexDirection: 'row', gap: 6 },
  weekDay: { flex: 1, borderRadius: 14, borderWidth: 1.5, paddingTop: 8, paddingBottom: 7, alignItems: 'center', gap: 2 },
  weekName: { fontSize: 10, lineHeight: 12, fontWeight: 700 },
  weekNumber: { fontSize: 17, lineHeight: 22, fontWeight: 800 },
  weekNote: { fontSize: 9, lineHeight: 12, fontWeight: 700 },
  hint: { fontSize: 11, lineHeight: 14, fontWeight: 600 },
  monthRow: { flexDirection: 'row' },
  monthHead: { flex: 1, textAlign: 'center', fontSize: 10, lineHeight: 14, fontWeight: 700 },
  monthCell: { flex: 1, height: 40, marginHorizontal: 2 },
  monthDay: { borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', gap: 2 },
  monthNumber: { fontSize: 14, lineHeight: 18, fontWeight: 700 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  star: { fontSize: 8, lineHeight: 8 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 11, lineHeight: 14, fontWeight: 600 },
});
