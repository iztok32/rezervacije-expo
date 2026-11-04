import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import {
  HeroPrimaryButton,
  HeroScreen,
  HeroSecondaryButton,
  HeroTile,
  heroStyles,
  type IconName,
} from '@/components/hero-screen';
import { Icon } from '@/components/icon';
import { Notice } from '@/components/notice';
import { NotifySheet } from '@/components/notify-sheet';
import { SlotAdmin } from '@/components/slot-admin';
import { ThemedText } from '@/components/themed-text';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, errorMessage } from '@/lib/api';
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
 * Podrobnosti termina in vse akcije, ki jih ima član na spletu — v slogu »Domov« (temna glava, ploščice).
 * Kaj je dovoljeno, pove strežnik (can_reserve, restriction, waiting_list.can_join …);
 * aplikacija ob oddaji pravil ne ponavlja.
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

  // Nakup v aplikaciji (zaslon »Nakup kuponov«); podokno termina se zapre
  function openPurchase() {
    onClose();
    router.push('/purchase');
  }

  const couponBalance = slot.coupon_type ? (calendar.coupon_balances[slot.coupon_type.id] ?? 0) : null;
  const missingCoupon = couponBalance !== null && couponBalance < 1;
  const horses = slot.horse_ids.length
    ? calendar.horses.filter((h) => slot.horse_ids.includes(h.id))
    : calendar.horses;
  const wl = slot.waiting_list;

  const capacityText = slot.capacity
    ? `${slot.booked}/${slot.capacity}${slot.is_full ? ' · polno' : ` · prostih ${slot.available}`}`
    : `Rezervacij: ${slot.booked}`;
  const ratio = slot.capacity ? Math.min(1, slot.booked / slot.capacity) : 0;

  const headerInfo = (
    <View style={styles.headerInfo}>
      <View style={styles.pills}>
        {slot.start_time && (
          <HeaderPill icon={{ ios: 'clock', md: 'schedule' }} text={formatTimeRange(slot.start_time, slot.end_time)} />
        )}
        <HeaderPill icon={{ ios: 'person.2', md: 'group' }} text={capacityText} />
      </View>
      {slot.capacity ? (
        <View style={[styles.bar, { backgroundColor: theme.heroControl }]}>
          <View
            style={[styles.barFill, { width: `${ratio * 100}%`, backgroundColor: slot.is_full ? theme.notifyDot : theme.success }]}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={onClose}>
      <HeroScreen overline={capitalize(longDate(date))} title={slot.name} onClose={onClose} headerExtra={headerInfo}>
        {info && <Notice tone="success" text={info} />}
        {error && <Notice tone="danger" text={error} />}
        {!isOnline && <Notice tone="warning" text="Brez povezave s strežnikom — akcije niso mogoče." />}
        {syncing && (
          <ThemedText themeColor="textSecondary" style={[heroStyles.meta, styles.center]}>
            Osvežujem stanje termina…
          </ThemedText>
        )}

        {/* ── Moja rezervacija ── */}
        {!syncing && slot.my_reservation && (
          <HeroTile style={styles.card}>
            <TileHeader icon={{ ios: 'checkmark.circle.fill', md: 'check_circle' }} tone="primary" label="Tvoja rezervacija" />
            <ThemedText style={heroStyles.tileTitle}>Na ta termin imaš rezervacijo</ThemedText>
            {slot.my_reservation.horse && (
              <View style={[styles.horseChip, { backgroundColor: theme.goldSoft }]}>
                <ThemedText style={[styles.horseChipText, { color: theme.gold }]}>Konj: {slot.my_reservation.horse}</ThemedText>
              </View>
            )}
            {slot.my_reservation.notes && (
              <ThemedText themeColor="textSecondary" style={heroStyles.body}>
                {slot.my_reservation.notes}
              </ThemedText>
            )}
            {canDelete && slot.my_reservation.can_cancel && (
              <HeroSecondaryButton
                title="Odpovej rezervacijo"
                icon={{ ios: 'xmark.circle', md: 'cancel' }}
                danger
                onPress={cancel}
                loading={busy === 'cancel'}
                disabled={!isOnline || busy !== null}
              />
            )}
            {!slot.my_reservation.can_cancel && (
              <>
                <ThemedText themeColor="textSecondary" style={heroStyles.body}>
                  Rok za odpoved je potekel
                  {calendar.limits.cancellation_days !== null
                    ? ` (odpoved je mogoča najkasneje ${calendar.limits.cancellation_days} dni pred terminom).`
                    : '.'}
                </ThemedText>
                {slot.my_reservation.late_cancellation_requested ? (
                  <View style={styles.status}>
                    <Icon ios="clock" md="schedule" size={18} color={theme.textSecondary} />
                    <ThemedText themeColor="textSecondary" style={heroStyles.meta}>
                      Prošnja za pozno odpoved je že poslana.
                    </ThemedText>
                  </View>
                ) : (
                  <HeroSecondaryButton
                    title="Pošlji prošnjo za pozno odpoved"
                    icon={{ ios: 'envelope', md: 'mail' }}
                    onPress={requestLateCancellation}
                    loading={busy === 'late'}
                    disabled={!isOnline || busy !== null}
                  />
                )}
              </>
            )}
          </HeroTile>
        )}

        {/* ── Nova rezervacija ── */}
        {/* Upravljavci (admin, učitelj) rezervirajo prek »Dodaj člana«, kjer so tudi sami na seznamu */}
        {!syncing && slot.can_reserve && canCreate && !calendar.capabilities?.reserve_for_others && (
          <HeroTile style={styles.card}>
            <TileHeader icon={{ ios: 'calendar.badge.plus', md: 'calendar_add_on' }} tone="primary" label="Nova rezervacija" />

            {slot.horses_selectable && horses.length > 0 && (
              <View style={styles.field}>
                <ThemedText style={styles.fieldLabel}>Konj (neobvezno)</ThemedText>
                <View style={styles.chips} accessibilityRole="radiogroup">
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
              <ThemedText style={styles.fieldLabel}>Opomba (neobvezno)</ThemedText>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                maxLength={NOTES_MAX}
                multiline
                accessibilityLabel="Opomba"
                placeholder="Npr. prvič jaham, prosim mirnega konja"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
              />
              <ThemedText themeColor="textSecondary" style={[heroStyles.meta, styles.counter]}>
                {notes.length} / {NOTES_MAX}
              </ThemedText>
            </View>

            {slot.coupon_type &&
              (missingCoupon ? (
                <View style={[styles.couponBox, { backgroundColor: theme.primarySoft }]}>
                  <Icon ios="ticket" md="confirmation_number" size={20} color={theme.danger} />
                  <View style={styles.flex}>
                    <ThemedText style={[styles.couponTitle, { color: theme.danger }]}>
                      Nimaš kupona »{slot.coupon_type.name}«
                    </ThemedText>
                    <ThemedText themeColor="textSecondary" style={heroStyles.meta}>
                      {perms?.purchase_view ? 'Kupon kupiš na spletni strani kluba.' : 'Za kupone se obrni na klub.'}
                    </ThemedText>
                  </View>
                  {perms?.purchase_view && (
                    <Pressable onPress={openPurchase} disabled={!isOnline} hitSlop={8} accessibilityRole="link">
                      <ThemedText style={[styles.couponLink, { color: theme.primary }]}>Kupi</ThemedText>
                    </Pressable>
                  )}
                </View>
              ) : (
                <View style={[styles.couponBox, { backgroundColor: theme.successSoft }]}>
                  <Icon ios="ticket" md="confirmation_number" size={20} color={theme.success} />
                  <View style={styles.flex}>
                    <ThemedText style={styles.couponTitle}>Porabi se 1 kupon »{slot.coupon_type.name}«</ThemedText>
                    <ThemedText themeColor="textSecondary" style={heroStyles.meta}>
                      Stanje zdaj: {couponBalance} · po rezervaciji: {(couponBalance ?? 1) - 1}
                    </ThemedText>
                  </View>
                </View>
              ))}

            <HeroPrimaryButton
              title="Rezerviraj"
              icon={{ ios: 'checkmark', md: 'check' }}
              onPress={reserve}
              loading={busy === 'reserve'}
              disabled={!isOnline || busy !== null || missingCoupon}
            />
          </HeroTile>
        )}

        {/* ── Poln termin: veriga ali čakalna vrsta ── */}
        {!syncing && slot.is_full && !slot.is_mine && (
          <HeroTile style={styles.card}>
            {slot.chain_free_appointment ? (
              <>
                <TileHeader icon={{ ios: 'arrow.right.circle', md: 'arrow_circle_right' }} tone="textSecondary" label="Termin je poln" />
                <ThemedText style={heroStyles.body}>
                  Prosta mesta so še v terminu »{slot.chain_free_appointment.name}«.
                </ThemedText>
              </>
            ) : wl.entry_id ? (
              <>
                <TileHeader icon={{ ios: 'hourglass', md: 'hourglass_top' }} tone="primary" label="Čakalna vrsta" />
                <View style={styles.queue}>
                  <View style={[styles.queueBox, { backgroundColor: theme.primary }]}>
                    <ThemedText style={[styles.queueNumber, { color: theme.onPrimary }]}>#{wl.position}</ThemedText>
                  </View>
                  <View style={styles.flex}>
                    <ThemedText style={heroStyles.tileTitle}>
                      Si v čakalni vrsti{wl.count > 1 ? ` (${wl.position}. od ${wl.count})` : ''}
                    </ThemedText>
                    <ThemedText
                      style={[
                        heroStyles.meta,
                        styles.queueText,
                        { color: wl.status === 'notified' ? theme.success : theme.textSecondary },
                      ]}>
                      {wl.status === 'notified'
                        ? 'Mesto se je sprostilo — rezerviraj čim prej!'
                        : 'Obvestili te bomo, ko se mesto sprosti.'}
                    </ThemedText>
                  </View>
                </View>
                {canDelete && (
                  <HeroSecondaryButton
                    title="Izstopi iz čakalne vrste"
                    icon={{ ios: 'xmark.circle', md: 'cancel' }}
                    danger
                    onPress={leaveWaitingList}
                    loading={busy === 'leave'}
                    disabled={!isOnline || busy !== null}
                  />
                )}
              </>
            ) : wl.can_join ? (
              <>
                <TileHeader icon={{ ios: 'hourglass', md: 'hourglass_top' }} tone="primary" label="Termin je poln" />
                <ThemedText style={heroStyles.tileTitle}>Vpiši se v čakalno vrsto</ThemedText>
                <ThemedText themeColor="textSecondary" style={heroStyles.body}>
                  Ko se mesto sprosti, te obvestimo po vrstnem redu vpisa.
                  {wl.count > 0 ? ` Pred tabo čaka: ${wl.count}.` : ' Trenutno ne čaka nihče.'}
                </ThemedText>
                <HeroPrimaryButton
                  title="Vpiši se v čakalno vrsto"
                  icon={{ ios: 'person.badge.plus', md: 'person_add' }}
                  onPress={joinWaitingList}
                  loading={busy === 'join'}
                  disabled={!isOnline || busy !== null}
                />
              </>
            ) : (
              <>
                <TileHeader icon={{ ios: 'xmark.circle', md: 'block' }} tone="textSecondary" label="Termin je poln" />
                <ThemedText themeColor="textSecondary" style={heroStyles.body}>
                  Vsa mesta so zasedena, vpis v čakalno vrsto ni mogoč.
                </ThemedText>
              </>
            )}
          </HeroTile>
        )}

        {/* ── Prijava ni mogoča ── */}
        {!slot.is_mine && !slot.is_full && slot.restriction && (
          <HeroTile style={styles.card}>
            <TileHeader icon={{ ios: 'lock', md: 'lock' }} tone="textSecondary" label="Prijava ni mogoča" />
            <ThemedText style={heroStyles.body}>{slot.restriction}</ThemedText>
          </HeroTile>
        )}

        {/* ── Upravljanje (admin, učitelj): udeleženci z akcijami, rezervacija za člana, čakalna vrsta ── */}
        {slot.can_notify && (
          <HeroSecondaryButton
            title="Obvesti udeležence termina"
            icon={{ ios: 'envelope', md: 'mail' }}
            onPress={() => setNotifyOpen(true)}
            disabled={!isOnline}
          />
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
            <ThemedText style={[heroStyles.label, heroStyles.sectionLabel, { color: theme.primary }]}>
              Prijavljeni ({slot.participants.length})
            </ThemedText>
            <HeroTile style={styles.list}>
              {slot.participants.length === 0 ? (
                <ThemedText themeColor="textSecondary" style={[heroStyles.body, styles.emptyList]}>
                  Še nihče. Bodi prvi na tem terminu.
                </ThemedText>
              ) : (
                slot.participants.map((p, i) => (
                  <View key={i}>
                    {i > 0 && <View style={[styles.separator, { backgroundColor: theme.border }]} />}
                    <View style={styles.person}>
                      <View style={[styles.avatar, { backgroundColor: p.is_me ? theme.primary : theme.backgroundSelected }]}>
                        <ThemedText style={[styles.avatarText, { color: p.is_me ? theme.onPrimary : theme.textSecondary }]}>
                          {initials(p.name)}
                        </ThemedText>
                      </View>
                      <ThemedText style={[styles.personName, p.is_me && { color: theme.primary }]} numberOfLines={1}>
                        {p.name}
                        {p.is_me ? ' (jaz)' : ''}
                      </ThemedText>
                      {p.horse && (
                        <View style={[styles.horseChip, { backgroundColor: theme.goldSoft }]}>
                          <ThemedText style={[styles.horseChipText, { color: theme.gold }]}>{p.horse}</ThemedText>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              )}
            </HeroTile>
          </View>
        )}
      </HeroScreen>
    </Modal>
  );
}

function longDate(date: string) {
  return formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

/** Pilula s podatkom v temni glavi (ura, zasedenost). */
function HeaderPill({ icon, text }: { icon: IconName; text: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: theme.heroControl }]}>
      <Icon ios={icon.ios} md={icon.md} size={16} color={theme.heroText} />
      <ThemedText style={[styles.pillText, { color: theme.heroText }]}>{text}</ThemedText>
    </View>
  );
}

/** Oznaka razdelka na vrhu ploščice z ikono (rdeča ali siva). */
function TileHeader({ icon, label, tone }: { icon: IconName; label: string; tone: 'primary' | 'textSecondary' }) {
  const theme = useTheme();
  const color = theme[tone];
  return (
    <View style={styles.tileHeader}>
      <Icon ios={icon.ios} md={icon.md} size={18} color={color} />
      <ThemedText style={[heroStyles.label, { color }]}>{label}</ThemedText>
    </View>
  );
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
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: selected ? theme.primary : theme.backgroundSelected },
        pressed && heroStyles.pressed,
      ]}>
      <ThemedText style={[styles.chipText, { color: selected ? theme.onPrimary : theme.text }]}>
        {label}
        {note ? (
          <ThemedText style={[styles.chipNote, { color: selected ? theme.onPrimary : theme.textSecondary }]}>{` · ${note}`}</ThemedText>
        ) : null}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  headerInfo: { gap: Spacing.three - Spacing.one },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 17 },
  pillText: { fontSize: 13, lineHeight: 18, fontWeight: 700 },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  card: { gap: Spacing.three - Spacing.one },
  tileHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  status: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 32 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, lineHeight: 18, fontWeight: 700 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12 },
  chipText: { fontSize: 14, lineHeight: 18, fontWeight: 700 },
  chipNote: { fontSize: 12, lineHeight: 16, fontWeight: 600 },
  input: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: Spacing.three - Spacing.one,
    minHeight: 88,
    fontSize: 15,
    fontFamily: FontFamily.medium,
    textAlignVertical: 'top',
  },
  counter: { textAlign: 'right' },
  couponBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - Spacing.one,
    padding: Spacing.three - Spacing.one,
    borderRadius: 14,
  },
  couponTitle: { fontSize: 14, lineHeight: 18, fontWeight: 700 },
  couponLink: { fontSize: 14, lineHeight: 18, fontWeight: 800 },
  queue: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  queueBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  queueNumber: { fontSize: 20, lineHeight: 24, fontWeight: 800 },
  queueText: { marginTop: 3 },
  section: { gap: 10 },
  list: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.one },
  emptyList: { padding: Spacing.three - Spacing.one },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - Spacing.one,
    paddingVertical: 10,
    paddingHorizontal: Spacing.three - Spacing.one,
  },
  avatar: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, lineHeight: 16, fontWeight: 800 },
  personName: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: 700 },
  horseChip: { alignSelf: 'flex-start', paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: 8 },
  horseChipText: { fontSize: 12, lineHeight: 16, fontWeight: 700 },
  separator: { height: 1, marginLeft: 60, marginRight: Spacing.three },
});
