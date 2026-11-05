import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { HeroAvatar, HeroChipButton, HeroSectionLabel, HeroSeparator, HeroTileHeader } from '@/components/hero-parts';
import { HeroPrimaryButton, HeroSecondaryButton, HeroTile, heroStyles } from '@/components/hero-screen';
import { Icon } from '@/components/icon';
import { Notice } from '@/components/notice';
import { PickerSheet, type PickerItem } from '@/components/picker-sheet';
import type { RunAction } from '@/components/slot-sheet';
import { ThemedText } from '@/components/themed-text';
import { FontFamily, Spacing } from '@/constants/theme';
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
  const theme = useTheme();
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
          <HeroPrimaryButton
            title="Dodaj člana na termin"
            icon={{ ios: 'person.badge.plus', md: 'person_add' }}
            onPress={() => setMemberPicker('reserve')}
            disabled={disabled}
          />
        ))}

      {/* ── Udeleženci ── */}
      <View style={styles.section}>
        <HeroSectionLabel>{`Prijavljeni (${slot.participants.length}${slot.capacity ? `/${slot.capacity}` : ''})`}</HeroSectionLabel>
        <HeroTile style={styles.list}>
          {slot.participants.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={[heroStyles.body, styles.empty]}>
              Še nihče.
            </ThemedText>
          ) : (
            slot.participants.map((p, i) => (
              <View key={p.reservation_id}>
                {i > 0 && <HeroSeparator inset={60} />}
                <ParticipantRow
                  participant={p}
                  canAssignHorse={!!caps?.assign_horses}
                  canCancel={canDelete && !!p.can_cancel}
                  busy={busy}
                  disabled={disabled}
                  onHorse={() => setHorseFor(p)}
                  onCancel={() => cancel(p)}
                />
              </View>
            ))
          )}
        </HeroTile>
      </View>

      {/* ── Čakalna vrsta (admin) ── */}
      {caps?.manage_waiting_list && (slot.waiting_list.entries?.length || slot.can_add_to_waiting_list) ? (
        <View style={styles.section}>
          <HeroSectionLabel>{`Čakalna vrsta (${slot.waiting_list.count})`}</HeroSectionLabel>
          {!!slot.waiting_list.entries?.length && (
            <HeroTile style={styles.list}>
              {slot.waiting_list.entries.map((w, i) => (
                <View key={w.id}>
                  {i > 0 && <HeroSeparator inset={60} />}
                  <View style={[styles.row, styles.padded]}>
                    <View style={[styles.position, { backgroundColor: theme.primarySoft }]}>
                      <ThemedText style={[styles.positionText, { color: theme.primary }]}>#{w.position}</ThemedText>
                    </View>
                    <View style={styles.rowText}>
                      <ThemedText style={styles.name} numberOfLines={1}>
                        {w.name}
                      </ThemedText>
                      {w.status === 'notified' && (
                        <ThemedText style={[heroStyles.meta, { color: theme.success }]}>obvestilo o prostem mestu je poslano</ThemedText>
                      )}
                    </View>
                    <HeroChipButton
                      label={busy === `waiting-${w.id}` ? '…' : 'Odstrani'}
                      tone="danger"
                      onPress={() => removeFromWaitingList(w.id, w.name)}
                      disabled={disabled}
                    />
                  </View>
                </View>
              ))}
            </HeroTile>
          )}
          {slot.can_add_to_waiting_list && (
            <HeroSecondaryButton
              title="Dodaj člana v čakalno vrsto"
              icon={{ ios: 'person.badge.plus', md: 'person_add' }}
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
    <View style={styles.participant}>
      <View style={styles.row}>
        <HeroAvatar name={p.name} highlight={p.is_me} />
        <View style={styles.rowText}>
          <ThemedText style={[styles.name, p.is_me && { color: theme.primary }]} numberOfLines={1}>
            {p.name}
            {p.is_me ? ' (jaz)' : ''}
          </ThemedText>
          {p.created_by && (
            <ThemedText themeColor="textSecondary" style={heroStyles.meta}>
              Vnos: {p.created_by}
            </ThemedText>
          )}
        </View>
      </View>
      {p.notes && (
        <ThemedText themeColor="textSecondary" style={[heroStyles.body, styles.indent]}>
          {p.notes}
        </ThemedText>
      )}
      <View style={[styles.actions, styles.indent]}>
        {canAssignHorse ? (
          <HeroChipButton
            label={busy === `horse-${p.reservation_id}` ? 'Shranjujem…' : `Konj: ${p.horse ?? 'ni dodeljen'}`}
            icon={{ ios: 'chevron.down', md: 'expand_more' }}
            tone={p.horse ? 'default' : 'warning'}
            onPress={onHorse}
            disabled={disabled}
          />
        ) : (
          <View style={[styles.horseChip, { backgroundColor: p.horse ? theme.goldSoft : theme.backgroundSelected }]}>
            <ThemedText style={[styles.horseChipText, { color: p.horse ? theme.gold : theme.textSecondary }]}>
              Konj: {p.horse ?? '—'}
            </ThemedText>
          </View>
        )}
        {canCancel ? (
          <HeroChipButton
            label={busy === `cancel-${p.reservation_id}` ? '…' : 'Odjavi'}
            icon={{ ios: 'xmark.circle', md: 'cancel' }}
            tone="danger"
            onPress={onCancel}
            disabled={disabled}
          />
        ) : (
          !p.can_cancel && (
            <ThemedText themeColor="textSecondary" style={heroStyles.meta}>
              rok za odjavo je potekel
            </ThemedText>
          )
        )}
      </View>
    </View>
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
    <HeroTile style={styles.card}>
      <HeroTileHeader icon={{ ios: 'person.badge.plus', md: 'person_add' }} label="Rezervacija za člana" />
      <View style={styles.row}>
        <HeroAvatar name={member.name} highlight />
        <ThemedText style={[styles.name, styles.rowText]} numberOfLines={1}>
          {member.name}
        </ThemedText>
        <HeroChipButton label="Zamenjaj" onPress={onChangeMember} />
        <HeroChipButton label="Prekliči" onPress={onDone} />
      </View>

      {canPickHorse && calendar.horses.length > 0 && (
        <View style={styles.field}>
          <ThemedText style={styles.fieldLabel}>Konj</ThemedText>
          <Pressable
            onPress={() => setHorsePicker(true)}
            accessibilityRole="button"
            accessibilityLabel={`Konj: ${horseName ?? 'brez izbire'}`}
            style={[styles.select, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <ThemedText style={[styles.rowText, styles.selectText]}>{horseName ?? 'Brez izbire'}</ThemedText>
            <Icon ios="chevron.down" md="expand_more" size={18} color={theme.textSecondary} />
          </Pressable>
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
          placeholder="Dodatne informacije…"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
        />
      </View>

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
          <View style={[styles.couponBox, { backgroundColor: theme.successSoft }]}>
            <Icon ios="ticket" md="confirmation_number" size={20} color={theme.success} />
            <ThemedText style={[heroStyles.body, styles.rowText]}>
              Porabi se 1 kupon »{slot.coupon_type.name}« · stanje člana: {balance}
            </ThemedText>
          </View>
        ))}

      <HeroPrimaryButton
        title="Rezerviraj za člana"
        icon={{ ios: 'checkmark', md: 'check' }}
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
    </HeroTile>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  list: { padding: Spacing.one },
  empty: { padding: Spacing.three - Spacing.one },
  card: { gap: Spacing.three - Spacing.one },
  participant: { gap: Spacing.two, paddingHorizontal: Spacing.three - Spacing.one, paddingVertical: Spacing.three - Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three - Spacing.one },
  padded: { paddingHorizontal: Spacing.three - Spacing.one, paddingVertical: Spacing.two + Spacing.half },
  rowText: { flex: 1, gap: 2 },
  name: { fontSize: 15, lineHeight: 20, fontWeight: 700 },
  indent: { marginLeft: 48 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  horseChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  horseChipText: { fontSize: 12, lineHeight: 16, fontWeight: 700 },
  position: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  positionText: { fontSize: 13, lineHeight: 16, fontWeight: 800 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, lineHeight: 18, fontWeight: 700 },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.three - Spacing.one,
  },
  selectText: { fontSize: 15, lineHeight: 20, fontWeight: 600 },
  input: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: Spacing.three - Spacing.one,
    minHeight: 72,
    fontSize: 15,
    fontFamily: FontFamily.medium,
    textAlignVertical: 'top',
  },
  couponBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - Spacing.one,
    padding: Spacing.three - Spacing.one,
    borderRadius: 14,
  },
});
