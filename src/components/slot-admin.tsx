import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Notice } from '@/components/notice';
import { PickerSheet, type PickerItem } from '@/components/picker-sheet';
import type { RunAction } from '@/components/slot-sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useMemberSearch } from '@/hooks/use-member-search';
import { useTheme } from '@/hooks/use-theme';
import { api, ApiError } from '@/lib/api';
import { useConnectivity } from '@/lib/connectivity';
import { confirmAction } from '@/lib/dialogs';
import { useSession } from '@/lib/session';
import type { Member, OccupancyResponse, OccupancySlot, Participant } from '@/lib/types';

const NOTES_MAX = 500;

/** Konji za izbiro: »brez konja« + aktivni konji z opombo, ali so v terminu že dodeljeni / niso na seznamu termina. */
export function horseItems(calendar: OccupancyResponse, slot: OccupancySlot, ownHorseId?: number | null): PickerItem<number | null>[] {
  return [
    { value: null, label: 'Brez konja' },
    ...calendar.horses.map((h) => {
      const notes = [
        slot.booked_horse_ids.includes(h.id) && h.id !== ownHorseId ? 'že dodeljen v tem terminu' : null,
        slot.horse_ids.length > 0 && !slot.horse_ids.includes(h.id) ? 'ni na seznamu termina' : null,
      ].filter(Boolean);
      return { value: h.id, label: h.name, note: notes.join(' · ') || undefined };
    }),
  ];
}

/**
 * Upravljanje termina za admina in učitelja: udeleženci (konj, odjava), rezervacija za člana
 * in čakalna vrsta z imeni. Kaj sme kdo, določa strežnik (capabilities, can_cancel …).
 */
export function SlotAdmin({
  slot,
  date,
  calendar,
  busy,
  run,
}: {
  slot: OccupancySlot;
  date: string;
  calendar: OccupancyResponse;
  busy: string | null;
  run: RunAction;
}) {
  const { user } = useSession();
  const { isOnline } = useConnectivity();
  const caps = calendar.capabilities;
  const canDelete = !!user?.permissions?.reservations_delete;
  const [horseFor, setHorseFor] = useState<Participant | null>(null);
  const [memberPicker, setMemberPicker] = useState<'reserve' | 'waiting' | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const memberSearch = useMemberSearch(memberPicker !== null);
  const disabled = !isOnline || busy !== null;

  async function cancel(p: Participant) {
    const ok = await confirmAction('Odjava člana', `${p.name}, termin »${slot.name}«: rezervacija bo odpovedana.`, 'Odjavi', true);
    if (!ok) return;
    run(`cancel-${p.reservation_id}`, () => api.delete(`/reservations/${p.reservation_id}`), `${p.name}: rezervacija je odpovedana.`);
  }

  function assignHorse(horseId: number | null) {
    const p = horseFor;
    setHorseFor(null);
    if (!p) return;
    run(
      `horse-${p.reservation_id}`,
      () => api.patch(`/reservations/${p.reservation_id}/horse`, { horse_id: horseId }),
      horseId ? 'Konj je dodeljen.' : 'Konj je odstranjen.',
    );
  }

  function pickMember(id: number) {
    const picked = memberSearch.members.find((m) => m.id === id) ?? null;
    const mode = memberPicker;
    setMemberPicker(null);
    if (!picked) return;
    if (mode === 'reserve') {
      setMember(picked);
    } else {
      run(
        'waiting-add',
        () => api.post('/waiting-list', { appointment_id: slot.appointment_id, date, user_id: picked.id }),
        `Vpis v čakalno vrsto: ${picked.name}.`,
      );
    }
  }

  function removeFromWaitingList(id: number, name: string) {
    run(`waiting-${id}`, () => api.delete(`/waiting-list/${id}`), `Odstranjeno iz čakalne vrste: ${name}.`);
  }

  const memberItems: PickerItem<number>[] = memberSearch.members.map((m) => ({
    value: m.id,
    label: m.name,
    note: [m.email, couponNote(slot, m)].filter(Boolean).join(' · '),
  }));

  return (
    <>
      {/* ── Rezervacija za člana ── */}
      {slot.can_reserve_for_others &&
        (member ? (
          <MemberBooking
            key={member.id}
            member={member}
            slot={slot}
            date={date}
            calendar={calendar}
            busy={busy}
            run={run}
            onChangeMember={() => setMemberPicker('reserve')}
            onDone={() => setMember(null)}
          />
        ) : (
          <Button title="+ Dodaj člana na termin" onPress={() => setMemberPicker('reserve')} disabled={disabled} />
        ))}

      {/* ── Udeleženci ── */}
      <View style={styles.section}>
        <ThemedText type="smallBold">
          Prijavljeni ({slot.participants.length}
          {slot.capacity ? `/${slot.capacity}` : ''})
        </ThemedText>
        {slot.participants.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary">
            Še nihče.
          </ThemedText>
        )}
        {slot.participants.map((p) => (
          <ParticipantRow
            key={p.reservation_id}
            participant={p}
            canAssignHorse={!!caps?.assign_horses}
            canCancel={canDelete && !!p.can_cancel}
            busy={busy}
            disabled={disabled}
            onHorse={() => setHorseFor(p)}
            onCancel={() => cancel(p)}
          />
        ))}
      </View>

      {/* ── Čakalna vrsta (admin) ── */}
      {caps?.manage_waiting_list && (slot.waiting_list.entries?.length || slot.can_add_to_waiting_list) ? (
        <View style={styles.section}>
          <ThemedText type="smallBold">Čakalna vrsta ({slot.waiting_list.count})</ThemedText>
          {slot.waiting_list.entries?.map((w) => (
            <ThemedView key={w.id} type="backgroundElement" style={styles.row}>
              <View style={styles.rowText}>
                <ThemedText type="small">
                  #{w.position} {w.name}
                </ThemedText>
                {w.status === 'notified' && (
                  <ThemedText type="small" themeColor="textSecondary">
                    obvestilo o prostem mestu je poslano
                  </ThemedText>
                )}
              </View>
              <SmallButton
                label="Odstrani"
                tone="danger"
                onPress={() => removeFromWaitingList(w.id, w.name)}
                disabled={disabled}
                loading={busy === `waiting-${w.id}`}
              />
            </ThemedView>
          ))}
          {slot.can_add_to_waiting_list && (
            <Button
              title="+ Dodaj člana v čakalno vrsto"
              variant="secondary"
              onPress={() => setMemberPicker('waiting')}
              loading={busy === 'waiting-add'}
              disabled={disabled}
            />
          )}
        </View>
      ) : null}

      {horseFor && (
        <PickerSheet
          title={`Konj za: ${horseFor.name}`}
          items={horseItems(calendar, slot, horseFor.horse_id)}
          selected={horseFor.horse_id ?? null}
          onSelect={assignHorse}
          onClose={() => setHorseFor(null)}
          searchPlaceholder="Išči konja…"
        />
      )}

      {memberPicker && (
        <PickerSheet
          title={memberPicker === 'reserve' ? 'Rezervacija za člana' : 'Dodaj v čakalno vrsto'}
          items={memberItems}
          onSelect={pickMember}
          onClose={() => setMemberPicker(null)}
          onSearch={memberSearch.search}
          loading={memberSearch.loading}
          searchPlaceholder="Ime ali e-pošta člana…"
          emptyText="Ni najdenih članov."
        />
      )}
    </>
  );
}

function couponNote(slot: OccupancySlot, member: Member): string | null {
  if (!slot.coupon_type) return null;
  const balance = member.coupon_balances[slot.coupon_type.id] ?? 0;
  return `kupon »${slot.coupon_type.name}«: ${balance}`;
}

function ParticipantRow({
  participant: p,
  canAssignHorse,
  canCancel,
  busy,
  disabled,
  onHorse,
  onCancel,
}: {
  participant: Participant;
  canAssignHorse: boolean;
  canCancel: boolean;
  busy: string | null;
  disabled: boolean;
  onHorse: () => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={styles.participant}>
      <ThemedText type="smallBold" style={p.is_me && { color: theme.primary }}>
        {p.name}
        {p.is_me ? ' (jaz)' : ''}
      </ThemedText>
      {p.notes && <ThemedText type="small">Opomba: {p.notes}</ThemedText>}
      {p.created_by && (
        <ThemedText type="small" themeColor="textSecondary">
          Vnos: {p.created_by}
        </ThemedText>
      )}
      <View style={styles.actions}>
        {canAssignHorse ? (
          <Pressable
            onPress={onHorse}
            disabled={disabled}
            accessibilityRole="button"
            style={[styles.horseButton, { borderColor: p.horse ? theme.backgroundSelected : theme.warning }]}>
            <ThemedText type="small" style={!p.horse && { color: theme.warning }}>
              {busy === `horse-${p.reservation_id}` ? 'Shranjujem…' : `Konj: ${p.horse ?? 'ni dodeljen'} ▾`}
            </ThemedText>
          </Pressable>
        ) : (
          <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
            Konj: {p.horse ?? '—'}
          </ThemedText>
        )}
        {canCancel ? (
          <SmallButton
            label="Odjavi"
            tone="danger"
            onPress={onCancel}
            disabled={disabled}
            loading={busy === `cancel-${p.reservation_id}`}
          />
        ) : (
          !p.can_cancel && (
            <ThemedText type="small" themeColor="textSecondary">
              rok za odjavo je potekel
            </ThemedText>
          )
        )}
      </View>
    </ThemedView>
  );
}

/** Obrazec za rezervacijo v imenu izbranega člana. */
function MemberBooking({
  member,
  slot,
  date,
  calendar,
  busy,
  run,
  onChangeMember,
  onDone,
}: {
  member: Member;
  slot: OccupancySlot;
  date: string;
  calendar: OccupancyResponse;
  busy: string | null;
  run: RunAction;
  onChangeMember: () => void;
  onDone: () => void;
}) {
  const theme = useTheme();
  const { isOnline } = useConnectivity();
  const isAdmin = !!calendar.capabilities?.assign_horses;
  const [horseId, setHorseId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [horsePicker, setHorsePicker] = useState(false);

  const balance = slot.coupon_type ? (member.coupon_balances[slot.coupon_type.id] ?? 0) : null;
  const missingCoupon = balance !== null && balance < 1;
  // Admin izbere katerega koli konja; učitelj samo, kjer tip termina dovoli izbiro (kot član)
  const canPickHorse = isAdmin || slot.horses_selectable;
  const horseName = calendar.horses.find((h) => h.id === horseId)?.name;

  function submit() {
    const body = {
      appointment_id: slot.appointment_id,
      reservation_date: date,
      user_id: member.id,
      horse_id: horseId,
      notes: notes.trim() || null,
    };
    run(
      'reserve-member',
      async () => {
        try {
          await api.post('/reservations', body);
        } catch (e) {
          // Admin: član nima kupona — po potrditvi rezerviraj, stanje gre v minus (kot na spletu)
          if (e instanceof ApiError && e.errors?.coupon_negative) {
            const ok = await confirmAction(
              'Ni kupona',
              `${member.name} nima kupona »${slot.coupon_type?.name ?? ''}«. Po rezervaciji bo stanje kuponov negativno.`,
              'Rezerviraj vseeno',
            );
            if (!ok) return false;
            await api.post('/reservations', { ...body, allow_negative_coupon: true });
          } else {
            throw e;
          }
        }
        onDone();
      },
      `${member.name}: rezervacija je oddana.`,
    );
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.actions}>
        <ThemedText type="smallBold" style={styles.flex}>
          Rezervacija za: {member.name}
        </ThemedText>
        <Pressable onPress={onChangeMember} hitSlop={8} accessibilityRole="button">
          <ThemedText type="linkPrimary">Zamenjaj</ThemedText>
        </Pressable>
        <Pressable onPress={onDone} hitSlop={8} accessibilityRole="button">
          <ThemedText type="linkPrimary">Prekliči</ThemedText>
        </Pressable>
      </View>

      {canPickHorse && calendar.horses.length > 0 && (
        <Pressable
          onPress={() => setHorsePicker(true)}
          accessibilityRole="button"
          style={[styles.horseButton, { borderColor: theme.backgroundSelected, alignSelf: 'flex-start' }]}>
          <ThemedText type="small">Konj: {horseName ?? 'brez izbire'} ▾</ThemedText>
        </Pressable>
      )}

      <TextInput
        value={notes}
        onChangeText={setNotes}
        maxLength={NOTES_MAX}
        multiline
        placeholder="Opomba (neobvezno)…"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
      />

      {slot.coupon_type &&
        (missingCoupon ? (
          <Notice
            tone={isAdmin ? 'warning' : 'danger'}
            text={
              isAdmin
                ? `Član nima kupona »${slot.coupon_type.name}«. Rezervacija je mogoča, stanje bo negativno.`
                : `Član nima kupona »${slot.coupon_type.name}«.`
            }
          />
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Porabi se 1 kupon »{slot.coupon_type.name}« (stanje člana: {balance}).
          </ThemedText>
        ))}

      <Button
        title="Rezerviraj za člana"
        onPress={submit}
        loading={busy === 'reserve-member'}
        disabled={!isOnline || busy !== null || (missingCoupon && !isAdmin)}
      />

      {horsePicker && (
        <PickerSheet
          title={`Konj za: ${member.name}`}
          items={
            isAdmin
              ? horseItems(calendar, slot)
              : horseItems(calendar, slot).filter((h) => h.value === null || !slot.horse_ids.length || slot.horse_ids.includes(h.value))
          }
          selected={horseId}
          onSelect={(v) => {
            setHorseId(v);
            setHorsePicker(false);
          }}
          onClose={() => setHorsePicker(false)}
          searchPlaceholder="Išči konja…"
        />
      )}
    </ThemedView>
  );
}

function SmallButton({
  label,
  tone,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  tone: 'danger' | 'primary';
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      hitSlop={6}
      accessibilityRole="button"
      style={({ pressed }) => [styles.smallButton, { borderColor: theme[tone], opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }]}>
      <ThemedText type="small" style={{ color: theme[tone] }}>
        {loading ? '…' : label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: Spacing.two },
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  participant: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.one },
  row: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowText: { flex: 1, gap: Spacing.half },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  horseButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 40,
    justifyContent: 'center',
  },
  smallButton: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 40,
    justifyContent: 'center',
  },
  input: {
    borderRadius: Spacing.two,
    padding: Spacing.two,
    minHeight: 60,
    fontSize: 16,
    textAlignVertical: 'top',
  },
});
