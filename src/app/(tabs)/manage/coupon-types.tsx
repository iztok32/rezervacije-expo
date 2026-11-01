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
import type { CouponPackage, CouponType, CouponTypesResponse } from '@/lib/types';

const euro = (value: number) => value.toLocaleString('sl-SI', { style: 'currency', currency: 'EUR' });
/** Cena v obrazcu: sprejme 12,50 ali 12.50. */
const parsePrice = (text: string) => (/^\d+([.,]\d{1,2})?$/.test(text.trim()) ? Number(text.trim().replace(',', '.')) : null);

type Editing = { kind: 'type'; item: CouponType | null } | { kind: 'package'; item: CouponPackage | null };

export default function CouponTypesScreen() {
  const padding = useContentPadding();
  const theme = useTheme();
  const { isOnline } = useConnectivity();
  const { data, error, loading, refreshing, refresh } = useApi<CouponTypesResponse>(isOnline ? '/coupon-types' : null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

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

  async function remove(kind: 'type' | 'package', id: number, name: string) {
    if (!(await confirmAction('Brisanje', `»${name}« bo izbrisan. Pozneje ga lahko obnoviš.`, 'Izbriši', true))) return;
    const path = kind === 'type' ? `/coupon-types/${id}` : `/coupon-packages/${id}`;
    act(`del-${kind}-${id}`, () => api.delete(path), 'Izbrisano.');
  }

  function rowActions(kind: 'type' | 'package', item: CouponType | CouponPackage) {
    if (!data) return null;
    if (item.deleted) {
      return data.can.edit ? (
        <Button
          title="Obnovi"
          variant="secondary"
          disabled={!isOnline}
          loading={busy === `res-${kind}-${item.id}`}
          onPress={() =>
            act(`res-${kind}-${item.id}`, () => api.post(kind === 'type' ? `/coupon-types/${item.id}/restore` : `/coupon-packages/${item.id}/restore`), 'Obnovljeno.')
          }
        />
      ) : null;
    }
    return (
      <>
        {data.can.edit && (
          <Button
            title="Uredi"
            variant="secondary"
            disabled={!isOnline}
            onPress={() => setEditing(kind === 'type' ? { kind, item: item as CouponType } : { kind, item: item as CouponPackage })}
          />
        )}
        {data.can.delete && (
          <Button title="Izbriši" variant="danger" disabled={!isOnline} loading={busy === `del-${kind}-${item.id}`} onPress={() => remove(kind, item.id, item.name)} />
        )}
      </>
    );
  }

  const status = (item: { deleted: boolean; is_active: boolean }) =>
    item.deleted || !item.is_active ? (
      <ThemedText type="smallBold" style={{ color: theme.warning }}>
        {item.deleted ? 'Izbrisan' : 'Neaktiven'}
      </ThemedText>
    ) : null;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[screenStyles.content, padding]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <SubHeader title="Tipi kuponov" />
        <OfflineBanner />
        {message && <Notice tone={message.ok ? 'success' : 'danger'} text={message.text} />}

        {!isOnline ? (
          <CenteredState message="Upravljanje je na voljo samo s povezavo." />
        ) : loading || error || !data ? (
          <CenteredState loading={loading} message={loading ? undefined : (error ?? undefined)} />
        ) : (
          <>
            <View style={styles.sectionHead}>
              <ThemedText type="smallBold" style={styles.flex}>
                Tipi kuponov (cena za kos)
              </ThemedText>
              {data.can.create && (
                <Pressable onPress={() => setEditing({ kind: 'type', item: null })} hitSlop={8} accessibilityRole="button">
                  <ThemedText type="linkPrimary">+ Nov tip</ThemedText>
                </Pressable>
              )}
            </View>
            {data.types.map((t) => (
              <ThemedView key={t.id} type="backgroundElement" style={[screenStyles.card, (t.deleted || !t.is_active) && { opacity: 0.6 }]}>
                <View style={styles.row}>
                  <ThemedText type="smallBold" style={styles.flex}>
                    {t.name}
                  </ThemedText>
                  <ThemedText type="smallBold">{euro(t.price)}</ThemedText>
                </View>
                {status(t)}
                <View style={styles.actions}>{rowActions('type', t)}</View>
              </ThemedView>
            ))}

            <View style={styles.sectionHead}>
              <ThemedText type="smallBold" style={styles.flex}>
                Paketi
              </ThemedText>
              {data.can.create && (
                <Pressable onPress={() => setEditing({ kind: 'package', item: null })} hitSlop={8} accessibilityRole="button">
                  <ThemedText type="linkPrimary">+ Nov paket</ThemedText>
                </Pressable>
              )}
            </View>
            {data.packages.length === 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                Ni paketov.
              </ThemedText>
            )}
            {data.packages.map((p) => (
              <ThemedView key={p.id} type="backgroundElement" style={[screenStyles.card, (p.deleted || !p.is_active) && { opacity: 0.6 }]}>
                <View style={styles.row}>
                  <ThemedText type="smallBold" style={styles.flex}>
                    {p.name}
                  </ThemedText>
                  <ThemedText type="smallBold">{euro(p.price)}</ThemedText>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {p.quantity} × {p.coupon_type ?? '—'}
                </ThemedText>
                {status(p)}
                <View style={styles.actions}>{rowActions('package', p)}</View>
              </ThemedView>
            ))}
          </>
        )}
      </ScrollView>

      {editing?.kind === 'type' && (
        <CouponTypeForm
          item={editing.item}
          onClose={() => setEditing(null)}
          onSaved={(text) => {
            setEditing(null);
            setMessage({ ok: true, text });
            emitDataChanged();
          }}
        />
      )}
      {editing?.kind === 'package' && data && (
        <PackageForm
          item={editing.item}
          types={data.types.filter((t) => !t.deleted)}
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

function CouponTypeForm({ item, onClose, onSaved }: { item: CouponType | null; onClose: () => void; onSaved: (m: string) => void }) {
  const { isOnline } = useConnectivity();
  const [name, setName] = useState(item?.name ?? '');
  const [price, setPrice] = useState(item ? String(item.price).replace('.', ',') : '');
  const [isActive, setIsActive] = useState(item?.is_active ?? true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  async function save() {
    const value = parsePrice(price);
    if (value === null) {
      setErrors({ price: 'Vpiši ceno, npr. 25,00.' });
      return;
    }
    setBusy(true);
    setErrors({});
    const body = { name: name.trim(), price: value, is_active: isActive };
    try {
      if (item) await api.put(`/coupon-types/${item.id}`, body);
      else await api.post('/coupon-types', body);
      onSaved(item ? 'Tip kupona je posodobljen.' : 'Tip kupona je dodan.');
    } catch (e) {
      setErrors({ ...fieldErrors(e), _: errorMessage(e) });
      setBusy(false);
    }
  }

  return (
    <Sheet title={item ? 'Uredi tip kupona' : 'Nov tip kupona'} onClose={onClose}>
      {errors._ && <Notice tone="danger" text={errors._} />}
      <FormCard>
        <TextField label="Ime" value={name} onChangeText={setName} error={errors.name} />
        <TextField label="Cena (€)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="25,00" error={errors.price} />
        <ToggleRow label="Aktiven (na voljo za nakup)" value={isActive} onValueChange={setIsActive} />
      </FormCard>
      <Button title="Shrani" onPress={save} loading={busy} disabled={!isOnline || !name.trim()} />
    </Sheet>
  );
}

function PackageForm({
  item,
  types,
  onClose,
  onSaved,
}: {
  item: CouponPackage | null;
  types: CouponType[];
  onClose: () => void;
  onSaved: (m: string) => void;
}) {
  const { isOnline } = useConnectivity();
  const [typeId, setTypeId] = useState<number | null>(item?.coupon_type_id ?? types[0]?.id ?? null);
  const [name, setName] = useState(item?.name ?? '');
  const [quantity, setQuantity] = useState(item ? String(item.quantity) : '10');
  const [price, setPrice] = useState(item ? String(item.price).replace('.', ',') : '');
  const [isActive, setIsActive] = useState(item?.is_active ?? true);
  const [picker, setPicker] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  async function save() {
    const value = parsePrice(price);
    const local: FieldErrors = {};
    if (value === null) local.price = 'Vpiši ceno, npr. 120,00.';
    if (!/^[1-9]\d*$/.test(quantity.trim())) local.quantity = 'Vpiši število kosov.';
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }
    setBusy(true);
    setErrors({});
    const body = { coupon_type_id: typeId, name: name.trim(), quantity: Number(quantity), price: value, is_active: isActive };
    try {
      if (item) await api.put(`/coupon-packages/${item.id}`, body);
      else await api.post('/coupon-packages', body);
      onSaved(item ? 'Paket je posodobljen.' : 'Paket je dodan.');
    } catch (e) {
      setErrors({ ...fieldErrors(e), _: errorMessage(e) });
      setBusy(false);
    }
  }

  return (
    <Sheet title={item ? 'Uredi paket' : 'Nov paket'} onClose={onClose}>
      {errors._ && <Notice tone="danger" text={errors._} />}
      <FormCard>
        <SelectField
          label="Tip kupona"
          valueLabel={types.find((t) => t.id === typeId)?.name ?? 'Izberi…'}
          onPress={() => setPicker(true)}
          error={errors.coupon_type_id}
        />
        <TextField label="Ime paketa" value={name} onChangeText={setName} placeholder="npr. 10 ur" error={errors.name} />
        <TextField label="Število kuponov" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" error={errors.quantity} />
        <TextField label="Cena paketa (€)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="120,00" error={errors.price} />
        <ToggleRow label="Aktiven (na voljo za nakup)" value={isActive} onValueChange={setIsActive} />
      </FormCard>
      <Button title="Shrani" onPress={save} loading={busy} disabled={!isOnline || !name.trim() || !typeId} />

      {picker && (
        <PickerSheet
          title="Tip kupona"
          items={types.map((t) => ({ value: t.id, label: t.name }))}
          selected={typeId ?? undefined}
          onSelect={(v) => {
            setTypeId(v);
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
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.two },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
});
