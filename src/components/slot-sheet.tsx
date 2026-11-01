import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Notice } from '@/components/notice';
import { NotifySheet } from '@/components/notify-sheet';
import { SlotAdmin } from '@/components/slot-admin';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, errorMessage } from '@/lib/api';
import { API_URL } from '@/lib/config';
import { useConnectivity } from '@/lib/connectivity';
import { emitDataChanged } from '@/lib/data-version';
import { formatDate, formatTimeRange } from '@/lib/dates';
import { confirmAction } from '@/lib/dialogs';
import { useSession } from '@/lib/session';
import type { OccupancyResponse, OccupancySlot } from '@/lib/types';

const NOTES_MAX = 500;

/** Izvede akcijo s skupnim prikazom napake/uspeha. call vrne false, če jo je uporabnik preklical. */
export type RunAction = (action: string, call: () => Promise<unknown>, success: string) => Promise<void>;

/**
 * Podrobnosti termina in vse akcije, ki jih ima član na spletu. Kaj je dovoljeno, pove strežnik
 * (can_reserve, restriction, waiting_list.can_join …); aplikacija ob oddaji pravil ne ponavlja.
 */
export function SlotSheet({
  slot,
  date,
  calendar,
  onClose,
}: {
  slot: OccupancySlot;
  date: string;
  calendar: OccupancyResponse;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { user } = useSession();
  const { isOnline } = useConnectivity();
  const [horseId, setHorseId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [notifyOpen, setNotifyOpen] = useState(false);
  // Po uspešni akciji do prihoda svežih podatkov (nov objekt slot) ne ponujamo starih gumbov
  const [staleSlot, setStaleSlot] = useState<OccupancySlot | null>(null);
  const syncing = staleSlot === slot;

  const perms = user?.permissions;
  const canCreate = !!perms?.reservations_create;
  const canDelete = !!perms?.reservations_delete;

  const run: RunAction = async (action, call, success) => {
    setBusy(action);
    setError(null);
    setInfo(null);
    try {
      if ((await call()) === false) return;
      setInfo(success);
      setStaleSlot(slot);
      emitDataChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const reserve = () =>
    run(
      'reserve',
      () =>
        api.post('/reservations', {
          appointment_id: slot.appointment_id,
          reservation_date: date,
          horse_id: horseId,
          notes: notes.trim() || null,
        }),
      'Rezervacija je oddana.',
    );

  async function cancel() {
    const reservation = slot.my_reservation;
    if (!reservation) return;
    const ok = await confirmAction('Odpoved rezervacije', `${slot.name}, ${longDate(date)}`, 'Odpovej', true);
    if (ok) {
      run('cancel', () => api.delete(`/reservations/${reservation.id}`), 'Rezervacija je odpovedana.');
    }
  }

  async function requestLateCancellation() {
    const reservation = slot.my_reservation;
    if (!reservation) return;
    const ok = await confirmAction(
      'Prošnja za pozno odpoved',
      'Rok za odpoved je potekel. Učitelju oziroma administratorju bo poslano obvestilo, da prosiš za odpoved.',
      'Pošlji',
    );
    if (ok) {
      run('late', () => api.post(`/reservations/${reservation.id}/late-cancellation`), 'Prošnja za pozno odpoved je poslana.');
    }
  }

  const joinWaitingList = () =>
    run(
      'join',
      () => api.post('/waiting-list', { appointment_id: slot.appointment_id, date }),
      'Vpis v čakalno vrsto je uspel. Obvestili te bomo, ko se mesto sprosti.',
    );

  const leaveWaitingList = () =>
    run(
      'leave',
      () => api.delete(`/waiting-list/${slot.waiting_list.entry_id}`),
      'Izpis iz čakalne vrste je uspel.',
    );

  async function openPurchase() {
    await WebBrowser.openBrowserAsync(`${API_URL}/purchase`);
    emitDataChanged();
  }

  const couponBalance = slot.coupon_type ? (calendar.coupon_balances[slot.coupon_type.id] ?? 0) : null;
  const missingCoupon = couponBalance !== null && couponBalance < 1;
  const horses = slot.horse_ids.length
    ? calendar.horses.filter((h) => slot.horse_ids.includes(h.id))
    : calendar.horses;
  const wl = slot.waiting_list;

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={onClose}>
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.topBar}>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
              <ThemedText type="linkPrimary">Zapri</ThemedText>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.title}>
                {slot.name}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {longDate(date)}
                {slot.start_time ? ` · ${formatTimeRange(slot.start_time, slot.end_time)}` : ''}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {slot.capacity
                  ? `Zasedeno ${slot.booked}/${slot.capacity}${slot.is_full ? ' · polno' : ` · prostih ${slot.available}`}`
                  : `Rezervacij: ${slot.booked} (brez omejitve)`}
              </ThemedText>
            </View>

            {info && <Notice tone="success" text={info} />}
            {error && <Notice tone="danger" text={error} />}
            {!isOnline && (
              <Notice tone="warning" text="Brez povezave s strežnikom — akcije niso mogoče." />
            )}
            {syncing && (
              <ThemedText type="small" themeColor="textSecondary">
                Osvežujem stanje termina…
              </ThemedText>
            )}

            {/* ── Moja rezervacija ── */}
            {!syncing && slot.my_reservation && (
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  Na ta termin imaš rezervacijo
                </ThemedText>
                {slot.my_reservation.horse && (
                  <ThemedText type="small">Konj: {slot.my_reservation.horse}</ThemedText>
                )}
                {slot.my_reservation.notes && (
                  <ThemedText type="small">Opomba: {slot.my_reservation.notes}</ThemedText>
                )}
                {canDelete && slot.my_reservation.can_cancel && (
                  <Button
                    title="Odpovej rezervacijo"
                    variant="danger"
                    onPress={cancel}
                    loading={busy === 'cancel'}
                    disabled={!isOnline || busy !== null}
                  />
                )}
                {!slot.my_reservation.can_cancel && (
                  <>
                    <ThemedText type="small" themeColor="textSecondary">
                      Rok za odpoved je potekel
                      {calendar.limits.cancellation_days !== null
                        ? ` (odpoved je mogoča najkasneje ${calendar.limits.cancellation_days} dni pred terminom).`
                        : '.'}
                    </ThemedText>
                    {slot.my_reservation.late_cancellation_requested ? (
                      <ThemedText type="smallBold">Prošnja za pozno odpoved je že poslana.</ThemedText>
                    ) : (
                      <Button
                        title="Pošlji prošnjo za pozno odpoved"
                        variant="secondary"
                        onPress={requestLateCancellation}
                        loading={busy === 'late'}
                        disabled={!isOnline || busy !== null}
                      />
                    )}
                  </>
                )}
              </ThemedView>
            )}

            {/* ── Nova rezervacija ── */}
            {/* Upravljavci (admin, učitelj) rezervirajo prek »Dodaj člana«, kjer so tudi sami na seznamu */}
            {!syncing && slot.can_reserve && canCreate && !calendar.capabilities?.reserve_for_others && (
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">Nova rezervacija</ThemedText>

                {slot.horses_selectable && horses.length > 0 && (
                  <View style={styles.field}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Konj (neobvezno)
                    </ThemedText>
                    <View style={styles.chips}>
                      <Chip label="Brez izbire" selected={horseId === null} onPress={() => setHorseId(null)} />
                      {horses.map((h) => (
                        <Chip
                          key={h.id}
                          label={h.name}
                          note={slot.booked_horse_ids.includes(h.id) ? 'zaseden' : undefined}
                          selected={horseId === h.id}
                          onPress={() => setHorseId(h.id)}
                        />
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.field}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Opomba (neobvezno)
                  </ThemedText>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    maxLength={NOTES_MAX}
                    multiline
                    placeholder="Dodatne informacije…"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                  />
                  <ThemedText type="small" themeColor="textSecondary" style={styles.counter}>
                    {notes.length} / {NOTES_MAX}
                  </ThemedText>
                </View>

                {slot.coupon_type &&
                  (missingCoupon ? (
                    <View style={styles.field}>
                      <Notice
                        tone="danger"
                        text={`Za ta termin potrebuješ kupon »${slot.coupon_type.name}«, ki ga nimaš.`}
                      />
                      {perms?.purchase_view ? (
                        <Button title="Nakup kuponov" variant="secondary" onPress={openPurchase} disabled={!isOnline} />
                      ) : (
                        <ThemedText type="small" themeColor="textSecondary">
                          Za kupone se obrni na klub.
                        </ThemedText>
                      )}
                    </View>
                  ) : (
                    <ThemedText type="small" themeColor="textSecondary">
                      Porabi se 1 kupon »{slot.coupon_type.name}« (stanje: {couponBalance}).
                    </ThemedText>
                  ))}

                <Button
                  title="Rezerviraj"
                  onPress={reserve}
                  loading={busy === 'reserve'}
                  disabled={!isOnline || busy !== null || missingCoupon}
                />
              </ThemedView>
            )}

            {/* ── Poln termin: veriga ali čakalna vrsta ── */}
            {!syncing && slot.is_full && !slot.is_mine && (
              <ThemedView type="backgroundElement" style={styles.card}>
                {slot.chain_free_appointment ? (
                  <ThemedText type="small">
                    Termin je poln, prosta mesta so še v terminu »{slot.chain_free_appointment.name}«.
                  </ThemedText>
                ) : wl.entry_id ? (
                  <>
                    <ThemedText type="smallBold">Si v čakalni vrsti</ThemedText>
                    <ThemedText type="small">
                      Tvoje mesto: #{wl.position}
                      {wl.count > 1 ? ` od ${wl.count}` : ''}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {wl.status === 'notified'
                        ? 'Mesto se je sprostilo — rezerviraj čim prej!'
                        : 'Obvestili te bomo, ko se mesto sprosti.'}
                    </ThemedText>
                    {canDelete && (
                      <Button
                        title="Izstopi iz čakalne vrste"
                        variant="secondary"
                        onPress={leaveWaitingList}
                        loading={busy === 'leave'}
                        disabled={!isOnline || busy !== null}
                      />
                    )}
                  </>
                ) : wl.can_join ? (
                  <>
                    <ThemedText type="smallBold">Termin je poln</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Vpiši se v čakalno vrsto. Ko se mesto sprosti, te bomo obvestili po vrstnem redu vpisa.
                      {wl.count > 0 ? ` Pred tabo čaka: ${wl.count}.` : ''}
                    </ThemedText>
                    <Button
                      title="Vpiši se v čakalno vrsto"
                      onPress={joinWaitingList}
                      loading={busy === 'join'}
                      disabled={!isOnline || busy !== null}
                    />
                  </>
                ) : (
                  <ThemedText type="small" themeColor="textSecondary">
                    Termin je poln.
                  </ThemedText>
                )}
              </ThemedView>
            )}

            {/* ── Prijava ni mogoča ── */}
            {!slot.is_mine && !slot.is_full && slot.restriction && (
              <Notice tone="warning" text={slot.restriction} />
            )}

            {/* ── Upravljanje (admin, učitelj): udeleženci z akcijami, rezervacija za člana, čakalna vrsta ── */}
            {slot.can_notify && (
              <Button title="✉ Obvesti udeležence termina" variant="secondary" onPress={() => setNotifyOpen(true)} disabled={!isOnline} />
            )}
            {calendar.capabilities?.reserve_for_others && !syncing && (
              <SlotAdmin slot={slot} date={date} calendar={calendar} busy={busy} run={run} />
            )}
            {notifyOpen && (
              <NotifySheet
                target={{ kind: 'slot', appointmentId: slot.appointment_id, name: slot.name, date, recipients: slot.booked }}
                channels={calendar.capabilities?.notify_channels ?? ['portal']}
                onClose={() => setNotifyOpen(false)}
              />
            )}

            {/* ── Udeleženci ── */}
            {!calendar.capabilities?.reserve_for_others && (
            <View style={styles.section}>
              <ThemedText type="smallBold">Prijavljeni ({slot.participants.length})</ThemedText>
              {slot.participants.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Še nihče.
                </ThemedText>
              ) : (
                slot.participants.map((p, i) => (
                  <ThemedText key={i} type="small" style={p.is_me && { color: theme.primary }}>
                    {p.name}
                    {p.is_me ? ' (jaz)' : ''}
                    {p.horse ? ` · ${p.horse}` : ''}
                  </ThemedText>
                ))
              )}
            </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

function longDate(date: string) {
  return formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
}

function Chip({
  label,
  note,
  selected,
  onPress,
}: {
  label: string;
  note?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        { backgroundColor: selected ? theme.primary : theme.background, borderColor: theme.backgroundSelected },
      ]}>
      <ThemedText type="small" style={selected && { color: '#fff' }}>
        {label}
        {note ? ` · ${note}` : ''}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  section: { gap: Spacing.one },
  title: { fontSize: 26, lineHeight: 32 },
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  field: { gap: Spacing.one },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    borderRadius: Spacing.four,
    borderWidth: 1,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  input: {
    borderRadius: Spacing.two,
    padding: Spacing.two,
    minHeight: 72,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  counter: { textAlign: 'right' },
});
