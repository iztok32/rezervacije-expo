import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { HeroAvatar, HeroSectionLabel, HeroSeparator } from '@/components/hero-parts';
import { HeroEmpty, HeroTile } from '@/components/hero-screen';
import { Icon } from '@/components/icon';
import { Notice } from '@/components/notice';
import { PickerSheet } from '@/components/picker-sheet';
import { Sheet } from '@/components/sheet';
import { horseItems } from '@/components/slot-admin';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, errorMessage } from '@/lib/api';
import { useConnectivity } from '@/lib/connectivity';
import { emitDataChanged } from '@/lib/data-version';
import { formatDate, formatTimeRange } from '@/lib/dates';
import type { OccupancyDay, OccupancyResponse, OccupancySlot, Participant } from '@/lib/types';

/** Dodeljevanje konj vsem rezervacijam dneva na enem zaslonu (admin) — kot »Dodeli konje za dan« na spletu. */
export function DayHorsesSheet({
  day,
  calendar,
  onClose,
}: {
  day: OccupancyDay;
  calendar: OccupancyResponse;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { isOnline } = useConnectivity();
  const [editing, setEditing] = useState<{ slot: OccupancySlot; participant: Participant } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const slots = day.slots.filter((s) => s.participants.length > 0);
  const missing = slots.reduce((n, s) => n + s.participants.filter((p) => !p.horse).length, 0);
  const date = formatDate(day.date, { weekday: 'long', day: 'numeric', month: 'long' });

  async function assign(horseId: number | null) {
    const target = editing;
    setEditing(null);
    if (!target?.participant.reservation_id) return;
    setBusyId(target.participant.reservation_id);
    setError(null);
    try {
      await api.patch(`/reservations/${target.participant.reservation_id}/horse`, { horse_id: horseId });
      emitDataChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Sheet
      title="Konji za dan"
      subtitle={`${date.charAt(0).toUpperCase()}${date.slice(1)} · ${missing > 0 ? `brez konja: ${missing}` : 'vsi imajo konja'}`}
      onClose={onClose}>
      {error && <Notice tone="danger" text={error} />}
      {!isOnline && <Notice tone="warning" text="Brez povezave s strežnikom — spremembe niso mogoče." />}
      {slots.length === 0 && (
        <HeroEmpty icon={{ ios: 'calendar', md: 'calendar_month' }} title="Ta dan ni rezervacij" text="Konje dodeliš, ko so na terminih prijavljeni člani." />
      )}
      {slots.map((slot) => (
        <View key={slot.appointment_id} style={styles.section}>
          <HeroSectionLabel>{`${formatTimeRange(slot.start_time, slot.end_time)} · ${slot.name}`}</HeroSectionLabel>
          <HeroTile style={styles.list}>
            {slot.participants.map((p, i) => (
              <View key={p.reservation_id}>
                {i > 0 && <HeroSeparator inset={60} />}
                <Pressable
                  disabled={!isOnline || busyId !== null}
                  onPress={() => setEditing({ slot, participant: p })}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.name}, konj: ${p.horse ?? 'ni dodeljen'}`}
                  accessibilityHint="Izberi konja"
                  style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.backgroundSelected }]}>
                  <HeroAvatar name={p.name} />
                  <ThemedText style={styles.name} numberOfLines={1}>
                    {p.name}
                  </ThemedText>
                  <View style={[styles.horse, { backgroundColor: p.horse ? theme.goldSoft : theme.warningBackground }]}>
                    <ThemedText style={[styles.horseText, { color: p.horse ? theme.gold : theme.warning }]} numberOfLines={1}>
                      {busyId === p.reservation_id ? 'Shranjujem…' : (p.horse ?? 'brez konja')}
                    </ThemedText>
                    <Icon ios="chevron.down" md="expand_more" size={14} color={p.horse ? theme.gold : theme.warning} />
                  </View>
                </Pressable>
              </View>
            ))}
          </HeroTile>
        </View>
      ))}

      {editing && (
        <PickerSheet
          title={`Konj za: ${editing.participant.name}`}
          items={horseItems(calendar, editing.slot, editing.participant.horse_id)}
          selected={editing.participant.horse_id ?? null}
          onSelect={assign}
          onClose={() => setEditing(null)}
          searchPlaceholder="Išči konja…"
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  list: { padding: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three - Spacing.one, minHeight: 56, paddingHorizontal: Spacing.three - Spacing.one, paddingVertical: Spacing.two, borderRadius: 14 },
  name: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: 700 },
  horse: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 150, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  horseText: { flexShrink: 1, fontSize: 12, lineHeight: 16, fontWeight: 700 },
});
