import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { fieldErrors, FormCard, SelectField, TextField, ToggleRow, type FieldErrors } from '@/components/form';
import { Notice } from '@/components/notice';
import { OfflineBanner } from '@/components/offline-banner';
import { PickerSheet } from '@/components/picker-sheet';
import { CenteredState, screenStyles, useContentPadding } from '@/components/screen';
import { Sheet, SubHeader } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useApi } from '@/hooks/use-api';
import { useTheme } from '@/hooks/use-theme';
import { api, errorMessage } from '@/lib/api';
import { useConnectivity } from '@/lib/connectivity';
import { emitDataChanged } from '@/lib/data-version';
import { confirmAction } from '@/lib/dialogs';
import type { AppointmentType, AppointmentTypesResponse } from '@/lib/types';

export default function AppointmentTypesScreen() {
  const padding = useContentPadding();
  const theme = useTheme();
  const { isOnline } = useConnectivity();
  const { data, error, loading, refreshing, refresh } = useApi<AppointmentTypesResponse>(isOnline ? '/appointment-types' : null);
  const [editing, setEditing] = useState<AppointmentType | 'new' | null>(null);
  const [order, setOrder] = useState<AppointmentType[] | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const couponName = (id: number | null) => data?.coupon_types.find((c) => c.id === id)?.name;
  const list = order ?? data?.data ?? [];

  async function act(key: string, call: () => Promise<unknown>, success: string) {
    setBusy(key);
    setMessage(null);
    try {
      await call();
      setMessage({ ok: true, text: success });
      emitDataChanged();
    } catch (e) {
      setMessage({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(null);
    }
  }

  async function remove(t: AppointmentType) {
    if (await confirmAction('Brisanje tipa', `Tip »${t.name}« bo izbrisan. Pozneje ga lahko obnoviš.`, 'Izbriši', true)) {
      act(`del-${t.id}`, () => api.delete(`/appointment-types/${t.id}`), 'Tip termina je izbrisan.');
    }
  }

  function move(index: number, delta: number) {
    if (!order) return;
    const next = [...order];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    setOrder(next);
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[screenStyles.content, padding]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <SubHeader
          title="Tipi terminov"
          right={
            data?.can.create && !order ? (
              <Pressable onPress={() => setEditing('new')} hitSlop={8} accessibilityRole="button">
                <ThemedText type="linkPrimary">+ Nov</ThemedText>
              </Pressable>
            ) : null
          }
        />
        <OfflineBanner />
        {message && <Notice tone={message.ok ? 'success' : 'danger'} text={message.text} />}

        {data?.can.edit && (
          <View style={styles.toolbar}>
            {order ? (
              <>
                <Button
                  title="Shrani vrstni red"
                  onPress={() =>
                    act('order', () => api.post('/appointment-types/reorder', { ids: order.map((t) => t.id) }), 'Vrstni red je shranjen.').then(() =>
                      setOrder(null),
                    )
                  }
                  loading={busy === 'order'}
                />
                <Pressable onPress={() => setOrder(null)} hitSlop={8} accessibilityRole="button">
                  <ThemedText type="linkPrimary">Prekliči</ThemedText>
                </Pressable>
              </>
            ) : (
              <Pressable onPress={() => setOrder(data.data.filter((t) => !t.deleted))} hitSlop={8} accessibilityRole="button">
                <ThemedText type="linkPrimary">Vrstni red</ThemedText>
              </Pressable>
            )}
          </View>
        )}

        {!isOnline ? (
          <CenteredState message="Upravljanje je na voljo samo s povezavo." />
        ) : loading || error || list.length === 0 ? (
          <CenteredState loading={loading} message={loading ? undefined : (error ?? 'Ni tipov terminov.')} />
        ) : (
          list.map((t, index) => (
            <ThemedView key={t.id} type="backgroundElement" style={[screenStyles.card, (t.deleted || !t.is_active) && { opacity: 0.6 }]}>
              <ThemedText type="smallBold">{t.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {[
                  t.horses_selectable ? 'član izbere konja' : 'konja določi admin',
                  t.coupon_type_id ? `porabi kupon »${couponName(t.coupon_type_id)}«` : 'brez kupona',
                ].join(' · ')}
              </ThemedText>
              {(t.deleted || !t.is_active) && (
                <ThemedText type="smallBold" style={{ color: theme.warning }}>
                  {t.deleted ? 'Izbrisan' : 'Neaktiven'}
                </ThemedText>
              )}
              <View style={styles.actions}>
                {order ? (
                  <>
                    <Button title="↑" variant="secondary" onPress={() => move(index, -1)} disabled={index === 0} />
                    <Button title="↓" variant="secondary" onPress={() => move(index, 1)} disabled={index === list.length - 1} />
                  </>
                ) : t.deleted ? (
                  data?.can.edit && (
                    <Button
                      title="Obnovi"
                      variant="secondary"
                      loading={busy === `res-${t.id}`}
                      disabled={!isOnline}
                      onPress={() => act(`res-${t.id}`, () => api.post(`/appointment-types/${t.id}/restore`), 'Tip termina je obnovljen.')}
                    />
                  )
                ) : (
                  <>
                    {data?.can.edit && <Button title="Uredi" variant="secondary" onPress={() => setEditing(t)} disabled={!isOnline} />}
                    {data?.can.delete && (
                      <Button title="Izbriši" variant="danger" onPress={() => remove(t)} loading={busy === `del-${t.id}`} disabled={!isOnline} />
                    )}
                  </>
                )}
              </View>
            </ThemedView>
          ))
        )}
      </ScrollView>

      {editing && data && (
        <TypeForm
          type={editing === 'new' ? null : editing}
          couponTypes={data.coupon_types}
          onClose={() => setEditing(null)}
          onSaved={(text) => {
            setEditing(null);
            setMessage({ ok: true, text });
            emitDataChanged();
          }}
        />
      )}
    </ThemedView>
  );
}

function TypeForm({
  type,
  couponTypes,
  onClose,
  onSaved,
}: {
  type: AppointmentType | null;
  couponTypes: { id: number; name: string }[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { isOnline } = useConnectivity();
  const [name, setName] = useState(type?.name ?? '');
  const [isActive, setIsActive] = useState(type?.is_active ?? true);
  const [horsesSelectable, setHorsesSelectable] = useState(type?.horses_selectable ?? true);
  const [couponTypeId, setCouponTypeId] = useState<number | null>(type?.coupon_type_id ?? null);
  const [picker, setPicker] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setErrors({});
    const body = { name: name.trim(), is_active: isActive, horses_selectable: horsesSelectable, coupon_type_id: couponTypeId };
    try {
      if (type) await api.put(`/appointment-types/${type.id}`, body);
      else await api.post('/appointment-types', body);
      onSaved(type ? 'Tip termina je posodobljen.' : 'Tip termina je dodan.');
    } catch (e) {
      setErrors({ ...fieldErrors(e), _: errorMessage(e) });
      setBusy(false);
    }
  }

  return (
    <Sheet title={type ? 'Uredi tip termina' : 'Nov tip termina'} onClose={onClose}>
      {errors._ && <Notice tone="danger" text={errors._} />}
      <FormCard>
        <TextField label="Ime" value={name} onChangeText={setName} error={errors.name} />
        <ToggleRow label="Aktiven" value={isActive} onValueChange={setIsActive} />
        <ToggleRow
          label="Član izbere konja"
          hint="Če je izklopljeno, konja določi administrator."
          value={horsesSelectable}
          onValueChange={setHorsesSelectable}
        />
        <SelectField
          label="Kupon, ki ga rezervacija porabi"
          valueLabel={couponTypes.find((c) => c.id === couponTypeId)?.name ?? 'Brez kupona'}
          onPress={() => setPicker(true)}
          error={errors.coupon_type_id}
        />
      </FormCard>
      <Button title="Shrani" onPress={save} loading={busy} disabled={!isOnline || !name.trim()} />

      {picker && (
        <PickerSheet
          title="Kupon"
          items={[{ value: null, label: 'Brez kupona' }, ...couponTypes.map((c) => ({ value: c.id, label: c.name }))]}
          selected={couponTypeId}
          onSelect={(v) => {
            setCouponTypeId(v);
            setPicker(false);
          }}
          onClose={() => setPicker(false)}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, justifyContent: 'flex-end' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
});
