import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { fieldErrors, FormCard, SelectField, TextField, type FieldErrors } from '@/components/form';
import { Notice } from '@/components/notice';
import { OfflineBanner } from '@/components/offline-banner';
import { PickerSheet } from '@/components/picker-sheet';
import { CenteredState, screenStyles, useContentPadding } from '@/components/screen';
import { Sheet, SubHeader } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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

export default function CouponsScreen() {
  const params = useLocalSearchParams<{ user_id?: string; name?: string }>();
  const padding = useContentPadding();
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
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[screenStyles.content, padding]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        keyboardShouldPersistTaps="handled">
        <SubHeader
          title={params.name ? `Kuponi: ${params.name}` : 'Kuponi'}
          right={
            data?.can.create ? (
              <Pressable onPress={() => setAdding(true)} hitSlop={8} accessibilityRole="button">
                <ThemedText type="linkPrimary">+ Vnos</ThemedText>
              </Pressable>
            ) : null
          }
        />
        <OfflineBanner />
        {message && <Notice tone={message.ok ? 'success' : 'danger'} text={message.text} />}

        {!params.user_id && data?.can.view_all && (
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Išči po imenu ali e-pošti člana…"
            placeholderTextColor={theme.textSecondary}
            autoCorrect={false}
            style={[styles.search, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
        )}

        {!isOnline ? (
          <CenteredState message="Kuponi so na voljo samo s povezavo." />
        ) : loading || error || !data || data.data.length === 0 ? (
          <CenteredState loading={loading} message={loading ? undefined : (error ?? 'Ni zapisov.')} />
        ) : (
          <>
            <ThemedText type="small" themeColor="textSecondary">
              Zapisov: {data.meta.total}
            </ThemedText>
            {data.data.map((c) => {
              const purchase = c.transaction_type === 'purchase';
              return (
                <ThemedView key={c.id} type="backgroundElement" style={[screenStyles.card, styles.entry]}>
                  <View style={styles.flex}>
                    <ThemedText type="smallBold">{c.user?.name ?? '—'}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {c.coupon_type?.name ?? '—'}
                      {c.created_at ? ` · ${new Date(c.created_at).toLocaleDateString('sl-SI')}` : ''}
                    </ThemedText>
                    {c.reservation && (
                      <ThemedText type="small" themeColor="textSecondary">
                        Rezervacija: {c.reservation.appointment ?? '—'}
                        {c.reservation.date ? `, ${formatDate(c.reservation.date, { day: 'numeric', month: 'numeric', year: 'numeric' })}` : ''}
                      </ThemedText>
                    )}
                  </View>
                  <View style={styles.right}>
                    <ThemedText type="smallBold" style={{ color: purchase ? theme.success : theme.danger }}>
                      {purchase ? '+' : '−'}
                      {c.quantity}
                    </ThemedText>
                    {data.can.delete && (
                      <Pressable onPress={() => remove(c)} disabled={!isOnline || busy !== null} hitSlop={8} accessibilityRole="button">
                        <ThemedText type="small" style={{ color: theme.danger }}>
                          {busy === c.id ? '…' : 'Izbriši'}
                        </ThemedText>
                      </Pressable>
                    )}
                  </View>
                </ThemedView>
              );
            })}
            {data.meta.last_page > 1 && (
              <View style={styles.pager}>
                <Button title="‹" variant="secondary" onPress={() => setPage((p) => p - 1)} disabled={page <= 1} />
                <ThemedText type="small" style={styles.flexCenter}>
                  Stran {data.meta.current_page} / {data.meta.last_page}
                </ThemedText>
                <Button title="›" variant="secondary" onPress={() => setPage((p) => p + 1)} disabled={page >= data.meta.last_page} />
              </View>
            )}
          </>
        )}
      </ScrollView>

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
    </ThemedView>
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
  const [picker, setPicker] = useState<'member' | 'type' | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const memberSearch = useMemberSearch(picker === 'member');

  async function save() {
    setBusy(true);
    setErrors({});
    try {
      await api.post('/coupons', { user_id: member?.id, coupon_type_id: couponTypeId, quantity: Number(quantity), transaction_type: kind });
      onSaved(`${member?.name}: ${kind === 'purchase' ? 'dodano' : 'odšteto'} ${quantity} × »${couponTypes.find((c) => c.id === couponTypeId)?.name}«.`);
    } catch (e) {
      setErrors({ ...fieldErrors(e), _: errorMessage(e) });
      setBusy(false);
    }
  }

  const balance = member?.balances && couponTypeId ? (member.balances[couponTypeId] ?? 0) : null;

  return (
    <Sheet title="Ročni vnos kuponov" onClose={onClose}>
      {errors._ && <Notice tone="danger" text={errors._} />}
      <FormCard>
        <SelectField label="Član" valueLabel={member?.name || 'Izberi člana…'} onPress={() => setPicker('member')} error={errors.user_id} />
        <SelectField
          label="Tip kupona"
          valueLabel={couponTypes.find((c) => c.id === couponTypeId)?.name ?? 'Izberi…'}
          onPress={() => setPicker('type')}
          error={errors.coupon_type_id}
        />
        {balance !== null && (
          <ThemedText type="small" themeColor="textSecondary">
            Trenutno stanje: {balance}
          </ThemedText>
        )}
        <View style={styles.kinds}>
          {(['purchase', 'usage'] as const).map((k) => (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              accessibilityRole="radio"
              accessibilityState={{ selected: kind === k }}
              style={[styles.kind, { backgroundColor: kind === k ? theme.primary : theme.background }]}>
              <ThemedText type="smallBold" style={kind === k && { color: '#fff' }}>
                {k === 'purchase' ? '+ Nakup' : '− Poraba'}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <TextField label="Količina" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" error={errors.quantity} />
      </FormCard>
      <Button
        title="Shrani vnos"
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
  container: { flex: 1 },
  flex: { flex: 1 },
  flexCenter: { flex: 1, textAlign: 'center' },
  search: { borderRadius: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, fontSize: 16 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  right: { alignItems: 'flex-end', gap: Spacing.one },
  pager: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  kinds: { flexDirection: 'row', gap: Spacing.two },
  kind: { flex: 1, paddingVertical: Spacing.two, borderRadius: Spacing.two, alignItems: 'center' },
});
