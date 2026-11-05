import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { fieldErrors, FormCard, SelectField, TextField, type FieldErrors } from '@/components/form';
import { HeroChipButton, HeroIconBox, HeroSearch, HeroSectionLabel, HeroSeparator } from '@/components/hero-parts';
import { HeroEmpty, HeroPrimaryButton, HeroScreen, HeroTile, heroStyles } from '@/components/hero-screen';
import { Notice } from '@/components/notice';
import { OfflineBanner } from '@/components/offline-banner';
import { PickerSheet } from '@/components/picker-sheet';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useApi } from '@/hooks/use-api';
import { useMemberSearch } from '@/hooks/use-member-search';
import { useTheme } from '@/hooks/use-theme';
import { api, errorMessage } from '@/lib/api';
import { useConnectivity } from '@/lib/connectivity';
import { emitDataChanged } from '@/lib/data-version';
import { formatDate } from '@/lib/dates';
import { confirmAction } from '@/lib/dialogs';
import type { CouponEntry, CouponsResponse, Member } from '@/lib/types';

/** Knjiga kuponov (admin): iskanje po članu, ročni vnos nakupa ali porabe, brisanje zapisov. */
export default function CouponsScreen() {
  const params = useLocalSearchParams<{ user_id?: string; name?: string }>();
  const theme = useTheme();
  const { isOnline } = useConnectivity();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Iskanje z zamikom, da ne kličemo strežnika ob vsaki črki
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(input.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [input]);

  const filter = params.user_id ? `&user_id=${params.user_id}` : `&q=${encodeURIComponent(query)}`;
  const { data, error, loading, refreshing, refresh } = useApi<CouponsResponse>(isOnline ? `/coupons?page=${page}${filter}` : null);

  async function remove(entry: CouponEntry) {
    const what = `${entry.user?.name ?? '—'}: ${entry.transaction_type === 'purchase' ? '+' : '−'}${entry.quantity} »${entry.coupon_type?.name ?? ''}«`;
    const warning = entry.transaction_type === 'usage' ? ' Brisanje porabe vrne kupon članu.' : '';
    if (!(await confirmAction('Brisanje zapisa', `${what}.${warning}`, 'Izbriši', true))) return;
    setBusy(entry.id);
    setMessage(null);
    try {
      await api.delete(`/coupons/${entry.id}`);
      setMessage({ ok: true, text: 'Zapis je izbrisan.' });
      emitDataChanged();
    } catch (e) {
      setMessage({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <HeroScreen
      overline={params.name ? 'Knjiga kuponov člana' : 'Knjiga kuponov'}
      title={params.name ?? 'Vsi člani'}
      back={params.user_id ? `/manage/member/${params.user_id}` : '/manage'}
      refreshing={refreshing}
      onRefresh={isOnline ? refresh : undefined}
      headerExtra={
        !params.user_id && data?.can.view_all ? (
          <HeroSearch value={input} onChangeText={setInput} placeholder="Išči po imenu ali e-pošti člana…" />
        ) : undefined
      }>
      <OfflineBanner />
      {message && <Notice tone={message.ok ? 'success' : 'danger'} text={message.text} />}

      {data?.can.create && (
        <HeroPrimaryButton title="Ročni vnos kuponov" icon={{ ios: 'plus', md: 'add' }} onPress={() => setAdding(true)} disabled={!isOnline} />
      )}

      {!isOnline ? (
        <HeroEmpty icon={{ ios: 'wifi.slash', md: 'wifi_off' }} title="Brez povezave" text="Kuponi so na voljo samo s povezavo." />
      ) : loading && !data ? (
        <ActivityIndicator color={theme.primary} style={styles.loading} />
      ) : error && !data ? (
        <HeroEmpty icon={{ ios: 'ticket', md: 'confirmation_number' }} title="Napaka pri nalaganju" text={error} />
      ) : !data || data.data.length === 0 ? (
        <HeroEmpty icon={{ ios: 'ticket', md: 'confirmation_number' }} title="Ni zapisov" text="Za izbrane pogoje v knjigi ni zapisov." />
      ) : (
        <View style={styles.section}>
          <HeroSectionLabel>{`Zapisov: ${data.meta.total}`}</HeroSectionLabel>
          <HeroTile style={styles.list}>
            {data.data.map((c, i) => {
              const purchase = c.transaction_type === 'purchase';
              return (
                <View key={c.id}>
                  {i > 0 && <HeroSeparator />}
                  <View style={styles.row}>
                    <HeroIconBox
                      icon={purchase ? { ios: 'plus', md: 'add' } : { ios: 'minus', md: 'remove' }}
                      tone={purchase ? 'success' : 'danger'}
                    />
                    <View style={styles.flex}>
                      <ThemedText style={styles.name} numberOfLines={1}>
                        {c.user?.name ?? '—'}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary" style={heroStyles.meta}>
                        {[purchase ? 'Nakup' : 'Poraba', c.coupon_type?.name, c.created_at && new Date(c.created_at).toLocaleDateString('sl-SI')]
                          .filter(Boolean)
                          .join(' · ')}
                      </ThemedText>
                      {c.reservation && (
                        <ThemedText themeColor="textSecondary" style={heroStyles.meta}>
                          Rezervacija: {c.reservation.appointment ?? '—'}
                          {c.reservation.date ? `, ${formatDate(c.reservation.date, { day: 'numeric', month: 'numeric', year: 'numeric' })}` : ''}
                        </ThemedText>
                      )}
                      {c.notes && (
                        <ThemedText themeColor="textSecondary" style={[heroStyles.body, styles.notes]}>
                          {c.notes}
                        </ThemedText>
                      )}
                    </View>
                    <View style={styles.right}>
                      <ThemedText style={[styles.qty, { color: purchase ? theme.success : theme.danger }]}>
                        {purchase ? '+' : '−'}
                        {c.quantity}
                      </ThemedText>
                      {data.can.delete && (
                        <HeroChipButton
                          label={busy === c.id ? '…' : 'Izbriši'}
                          tone="danger"
                          onPress={() => remove(c)}
                          disabled={!isOnline || busy !== null}
                        />
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </HeroTile>

          {data.meta.last_page > 1 && (
            <View style={styles.pager}>
              <HeroChipButton
                label="Prejšnja"
                icon={{ ios: 'chevron.left', md: 'chevron_left' }}
                onPress={() => setPage((p) => p - 1)}
                disabled={page <= 1}
              />
              <ThemedText themeColor="textSecondary" style={[heroStyles.meta, styles.pageText]}>
                Stran {data.meta.current_page} / {data.meta.last_page}
              </ThemedText>
              <HeroChipButton
                label="Naslednja"
                icon={{ ios: 'chevron.right', md: 'chevron_right' }}
                onPress={() => setPage((p) => p + 1)}
                disabled={page >= data.meta.last_page}
              />
            </View>
          )}
        </View>
      )}

      {adding && data && (
        <EntryForm
          couponTypes={data.coupon_types}
          initialMember={params.user_id ? { id: Number(params.user_id), name: params.name ?? '' } : null}
          onClose={() => setAdding(false)}
          onSaved={(text) => {
            setAdding(false);
            setMessage({ ok: true, text });
            emitDataChanged();
          }}
        />
      )}
    </HeroScreen>
  );
}

function EntryForm({
  couponTypes,
  initialMember,
  onClose,
  onSaved,
}: {
  couponTypes: { id: number; name: string }[];
  initialMember: { id: number; name: string } | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const theme = useTheme();
  const { isOnline } = useConnectivity();
  const [member, setMember] = useState<{ id: number; name: string; balances?: Member['coupon_balances'] } | null>(initialMember);
  const [couponTypeId, setCouponTypeId] = useState<number | null>(couponTypes[0]?.id ?? null);
  const [kind, setKind] = useState<'purchase' | 'usage'>('purchase');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [picker, setPicker] = useState<'member' | 'type' | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const memberSearch = useMemberSearch(picker === 'member');

  async function save() {
    setBusy(true);
    setErrors({});
    try {
      await api.post('/coupons', {
        user_id: member?.id,
        coupon_type_id: couponTypeId,
        quantity: Number(quantity),
        transaction_type: kind,
        notes: notes.trim() || null,
      });
      onSaved(`${member?.name}: ${kind === 'purchase' ? 'dodano' : 'odšteto'} ${quantity} × »${couponTypes.find((c) => c.id === couponTypeId)?.name}«.`);
    } catch (e) {
      setErrors({ ...fieldErrors(e), _: errorMessage(e) });
      setBusy(false);
    }
  }

  const balance = member?.balances && couponTypeId ? (member.balances[couponTypeId] ?? 0) : null;

  return (
    <Sheet title="Ročni vnos kuponov" subtitle="Knjiga kuponov" onClose={onClose}>
      {errors._ && <Notice tone="danger" text={errors._} />}
      <FormCard title="Član in kupon">
        <SelectField label="Član" valueLabel={member?.name || 'Izberi člana…'} onPress={() => setPicker('member')} error={errors.user_id} />
        <SelectField
          label="Tip kupona"
          valueLabel={couponTypes.find((c) => c.id === couponTypeId)?.name ?? 'Izberi…'}
          onPress={() => setPicker('type')}
          error={errors.coupon_type_id}
        />
        {balance !== null && (
          <ThemedText themeColor="textSecondary" style={heroStyles.meta}>
            Trenutno stanje: {balance}
          </ThemedText>
        )}
      </FormCard>

      <FormCard title="Vnos">
        <View style={styles.kinds} accessibilityRole="radiogroup">
          {(['purchase', 'usage'] as const).map((k) => {
            const on = kind === k;
            return (
              <Pressable
                key={k}
                onPress={() => setKind(k)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                aria-checked={on}
                style={({ pressed }) => [
                  styles.kind,
                  { backgroundColor: on ? (k === 'purchase' ? theme.success : theme.danger) : theme.backgroundSelected },
                  pressed && heroStyles.pressed,
                ]}>
                <ThemedText style={[styles.kindText, { color: on ? theme.onPrimary : theme.text }]}>
                  {k === 'purchase' ? '+ Nakup' : '− Poraba'}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        <TextField label="Količina" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" error={errors.quantity} />
        <TextField
          label="Opomba (neobvezno)"
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="npr. plačano z gotovino"
          hint={`${notes.length} / 500`}
          error={errors.notes}
        />
      </FormCard>

      <HeroPrimaryButton
        title="Shrani vnos"
        icon={{ ios: 'checkmark', md: 'check' }}
        onPress={save}
        loading={busy}
        disabled={!isOnline || !member || !couponTypeId || !/^[1-9]\d*$/.test(quantity)}
      />

      {picker === 'member' && (
        <PickerSheet
          title="Član"
          items={memberSearch.members.map((m) => ({ value: m.id, label: m.name, note: m.email }))}
          onSelect={(id) => {
            const m = memberSearch.members.find((x) => x.id === id);
            if (m) setMember({ id: m.id, name: m.name, balances: m.coupon_balances });
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
          onSearch={memberSearch.search}
          loading={memberSearch.loading}
          searchPlaceholder="Ime ali e-pošta člana…"
          emptyText="Ni najdenih članov."
        />
      )}
      {picker === 'type' && (
        <PickerSheet
          title="Tip kupona"
          items={couponTypes.map((c) => ({ value: c.id, label: c.name }))}
          selected={couponTypeId ?? undefined}
          onSelect={(v) => {
            setCouponTypeId(v);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { paddingVertical: Spacing.five },
  section: { gap: 10 },
  list: { padding: Spacing.one },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - Spacing.one,
    paddingHorizontal: Spacing.three - Spacing.one,
    paddingVertical: Spacing.three - Spacing.one,
  },
  name: { fontSize: 15, lineHeight: 20, fontWeight: 700 },
  notes: { marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 6 },
  qty: { fontSize: 20, lineHeight: 24, fontWeight: 800 },
  pager: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  pageText: { flex: 1, textAlign: 'center' },
  kinds: { flexDirection: 'row', gap: Spacing.two },
  kind: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  kindText: { fontSize: 14, lineHeight: 18, fontWeight: 700 },
});
