import { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Notice } from '@/components/notice';
import { PickerSheet } from '@/components/picker-sheet';
import { horseItems } from '@/components/slot-admin';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
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
    <Modal
      visible
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={onClose}>
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <View style={styles.flex}>
              <ThemedText type="smallBold" style={styles.title}>
                Konji za dan
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatDate(day.date, { weekday: 'long', day: 'numeric', month: 'long' })}
                {missing > 0 ? ` · brez konja: ${missing}` : ' · vsi imajo konja'}
              </ThemedText>
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
              <ThemedText type="linkPrimary">Zapri</ThemedText>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {error && <Notice tone="danger" text={error} />}
            {!isOnline && <Notice tone="warning" text="Brez povezave s strežnikom — spremembe niso mogoče." />}
            {slots.length === 0 && (
              <ThemedText themeColor="textSecondary">Ta dan ni rezervacij.</ThemedText>
            )}
            {slots.map((slot) => (
              <View key={slot.appointment_id} style={styles.section}>
                <ThemedText type="smallBold">
                  {slot.name} · {formatTimeRange(slot.start_time, slot.end_time)}
                </ThemedText>
                {slot.participants.map((p) => (
                  <Pressable
                    key={p.reservation_id}
                    disabled={!isOnline || busyId !== null}
                    onPress={() => setEditing({ slot, participant: p })}
                    accessibilityRole="button"
                    accessibilityHint="Izberi konja"
                    style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                    <ThemedView type="backgroundElement" style={styles.row}>
                      <ThemedText type="small" style={styles.flex}>
                        {p.name}
                      </ThemedText>
                      <ThemedText type="smallBold" style={{ color: p.horse ? theme.text : theme.warning }}>
                        {busyId === p.reservation_id ? 'Shranjujem…' : `${p.horse ?? 'brez konja'} ▾`}
                      </ThemedText>
                    </ThemedView>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </ThemedView>

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
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  title: { fontSize: 18 },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  section: { gap: Spacing.two },
  row: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 52,
  },
});
