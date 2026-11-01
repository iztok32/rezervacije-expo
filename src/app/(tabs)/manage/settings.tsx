import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { fieldErrors, FormCard, SelectField, TextField, type FieldErrors } from '@/components/form';
import { Notice } from '@/components/notice';
import { OfflineBanner } from '@/components/offline-banner';
import { MultiPickerSheet } from '@/components/picker-sheet';
import { CenteredState, screenStyles, useContentPadding } from '@/components/screen';
import { SubHeader } from '@/components/sheet';
import { ThemedView } from '@/components/themed-view';
import { useApi } from '@/hooks/use-api';
import { api, errorMessage } from '@/lib/api';
import { useConnectivity } from '@/lib/connectivity';
import { emitDataChanged } from '@/lib/data-version';
import type { ReservationSettings } from '@/lib/types';

export default function SettingsScreen() {
  const padding = useContentPadding();
  const { isOnline } = useConnectivity();
  const { data, error, loading } = useApi<ReservationSettings>(isOnline ? '/settings/reservations' : null);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[screenStyles.content, padding]} keyboardShouldPersistTaps="handled">
        <SubHeader title="Nastavitve rezervacij" />
        <OfflineBanner />
        {!isOnline ? (
          <CenteredState message="Nastavitve so na voljo samo s povezavo." />
        ) : loading || error || !data ? (
          <CenteredState loading={loading} message={loading ? undefined : (error ?? undefined)} />
        ) : (
          <SettingsForm key={JSON.stringify(data)} settings={data} />
        )}
      </ScrollView>
    </ThemedView>
  );
}

function SettingsForm({ settings }: { settings: ReservationSettings }) {
  const { isOnline } = useConnectivity();
  const [min, setMin] = useState(String(settings.min_days_in_advance));
  const [max, setMax] = useState(String(settings.max_days_in_advance));
  const [cancel, setCancel] = useState(String(settings.cancellation_days));
  const [admins, setAdmins] = useState<number[]>(settings.default_admin_ids);
  const [picker, setPicker] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    const local: FieldErrors = {};
    for (const [key, value] of [['min_days_in_advance', min], ['max_days_in_advance', max], ['cancellation_days', cancel]] as const) {
      if (!/^\d+$/.test(value.trim())) local[key] = 'Vpiši celo število.';
    }
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      const res = await api.put<{ message: string }>('/settings/reservations', {
        min_days_in_advance: Number(min),
        max_days_in_advance: Number(max),
        cancellation_days: Number(cancel),
        default_admin_ids: admins,
      });
      setMessage({ ok: true, text: res.message });
      emitDataChanged();
    } catch (e) {
      setErrors(fieldErrors(e));
      setMessage({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  const adminNames = settings.admin_users.filter((u) => admins.includes(u.id)).map((u) => u.name);

  return (
    <>
      {message && <Notice tone={message.ok ? 'success' : 'danger'} text={message.text} />}
      <FormCard title="Roki (veljajo za člane, ne za administratorje)">
        <TextField
          label="Rezervacija najmanj dni vnaprej"
          value={min}
          onChangeText={setMin}
          keyboardType="number-pad"
          hint="0 = rezervacija je mogoča tudi za danes"
          error={errors.min_days_in_advance}
        />
        <TextField
          label="Rezervacija največ dni vnaprej"
          value={max}
          onChangeText={setMax}
          keyboardType="number-pad"
          error={errors.max_days_in_advance}
        />
        <TextField
          label="Odpoved najkasneje dni pred terminom"
          value={cancel}
          onChangeText={setCancel}
          keyboardType="number-pad"
          hint="Po tem roku član lahko le zaprosi za pozno odpoved."
          error={errors.cancellation_days}
        />
      </FormCard>
      <FormCard title="Obvestila">
        <SelectField
          label="Prejemniki prošenj za pozno odpoved, če termin nima učitelja"
          valueLabel={adminNames.length ? adminNames.join(', ') : 'Nihče'}
          onPress={() => setPicker(true)}
          error={errors.default_admin_ids}
        />
      </FormCard>
      <Button title="Shrani nastavitve" onPress={save} loading={busy} disabled={!isOnline} />

      {picker && (
        <MultiPickerSheet
          title="Privzeti administratorji"
          items={settings.admin_users.map((u) => ({ value: u.id, label: u.name }))}
          initial={admins}
          onDone={(v) => {
            setAdmins(v);
            setPicker(false);
          }}
          onClose={() => setPicker(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
