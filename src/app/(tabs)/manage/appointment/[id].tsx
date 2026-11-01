import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { DaysField, fieldErrors, FormCard, SelectField, TextField, ToggleRow, type FieldErrors } from '@/components/form';
import { Notice } from '@/components/notice';
import { MultiPickerSheet, PickerSheet } from '@/components/picker-sheet';
import { CenteredState, screenStyles, useContentPadding } from '@/components/screen';
import { goBack, SubHeader } from '@/components/sheet';
import { ThemedView } from '@/components/themed-view';
import { useApi } from '@/hooks/use-api';
import { api, errorMessage } from '@/lib/api';
import { useConnectivity } from '@/lib/connectivity';
import { emitDataChanged } from '@/lib/data-version';
import { parseUserDate, parseUserTime, toDateString, toUserDate } from '@/lib/dates';
import { confirmAction } from '@/lib/dialogs';
import type { Appointment, AppointmentDays, AppointmentsResponse } from '@/lib/types';

type Form = AppointmentDays & {
  name: string;
  type: number | null;
  start_time: string;
  end_time: string;
  capacity: string;
  valid_from: string;
  valid_to: string;
  is_active: boolean;
  chained_next_appointment_id: number | null;
  horse_ids: number[];
  teacher_ids: number[];
};

const EMPTY: Form = {
  name: '',
  type: null,
  day_monday: false,
  day_tuesday: false,
  day_wednesday: false,
  day_thursday: false,
  day_friday: false,
  day_saturday: false,
  day_sunday: false,
  start_time: '',
  end_time: '',
  capacity: '',
  valid_from: '',
  valid_to: '',
  is_active: true,
  chained_next_appointment_id: null,
  horse_ids: [],
  teacher_ids: [],
};

function toForm(a: Appointment): Form {
  return {
    name: a.name,
    type: a.type,
    day_monday: a.day_monday,
    day_tuesday: a.day_tuesday,
    day_wednesday: a.day_wednesday,
    day_thursday: a.day_thursday,
    day_friday: a.day_friday,
    day_saturday: a.day_saturday,
    day_sunday: a.day_sunday,
    start_time: a.start_time ?? '',
    end_time: a.end_time ?? '',
    capacity: a.capacity ? String(a.capacity) : '',
    valid_from: toUserDate(a.valid_from),
    valid_to: toUserDate(a.valid_to),
    is_active: a.is_active,
    chained_next_appointment_id: a.chained_next_appointment_id,
    horse_ids: a.horse_ids,
    teacher_ids: a.teacher_ids,
  };
}

export default function AppointmentFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isOnline } = useConnectivity();
  const { data, error, loading } = useApi<AppointmentsResponse>(isOnline ? '/appointments' : null);
  const padding = useContentPadding();
  const isNew = id === 'new';
  const existing = data?.data.find((a) => String(a.id) === id);

  if (!isOnline) return <Shell padding={padding} title="Termin"><CenteredState message="Urejanje je na voljo samo s povezavo." /></Shell>;
  if (loading || error || !data) return <Shell padding={padding} title="Termin"><CenteredState loading={loading} message={error ?? undefined} /></Shell>;
  if (!isNew && !existing) return <Shell padding={padding} title="Termin"><CenteredState message="Termin ne obstaja (več)." /></Shell>;

  return <AppointmentForm key={id} data={data} existing={existing ?? null} padding={padding} />;
}

function Shell({ padding, title, children }: { padding: object; title: string; children: React.ReactNode }) {
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[screenStyles.content, padding]}>
        <SubHeader title={title} back="/manage/appointments" />
        {children}
      </ScrollView>
    </ThemedView>
  );
}

function AppointmentForm({
  data,
  existing,
  padding,
}: {
  data: AppointmentsResponse;
  existing: Appointment | null;
  padding: object;
}) {
  const { isOnline } = useConnectivity();
  const [form, setForm] = useState<Form>(existing ? toForm(existing) : EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [picker, setPicker] = useState<'type' | 'next' | 'horses' | 'teachers' | null>(null);

  const canSave = existing ? data.can.edit : data.can.create;
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));
  const today = toDateString(new Date());

  // Veriga: naslednji termin mora biti aktiven, istega tipa in ne sme že slediti drugemu
  const chainCandidates = data.data.filter(
    (a) =>
      a.id !== existing?.id &&
      a.is_active &&
      !(a.valid_to && a.valid_to < today) &&
      (form.type === null || a.type === form.type) &&
      (!a.chained_after_appointment_id || a.chained_after_appointment_id === existing?.id),
  );
  const nameOf = (id: number | null) => data.data.find((a) => a.id === id)?.name;
  const typeName = data.types.find((t) => t.id === form.type)?.name;

  async function save() {
    const local: FieldErrors = {};
    const start = parseUserTime(form.start_time);
    const end = parseUserTime(form.end_time);
    const from = parseUserDate(form.valid_from);
    const to = parseUserDate(form.valid_to);
    if (!form.name.trim()) local.name = 'Vpiši ime termina.';
    if (!start) local.start_time = 'Vpiši uro, npr. 17:00.';
    if (!end) local.end_time = 'Vpiši uro, npr. 18:00.';
    if (from === undefined) local.valid_from = 'Datum vpiši kot 15.11.2026.';
    if (to === undefined) local.valid_to = 'Datum vpiši kot 15.11.2026.';
    if (form.capacity && !/^\d+$/.test(form.capacity.trim())) local.capacity = 'Vpiši celo število ali pusti prazno.';
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }

    setBusy('save');
    setErrors({});
    setMessage(null);
    const body = {
      ...form,
      name: form.name.trim(),
      start_time: start,
      end_time: end,
      valid_from: from,
      valid_to: to,
      capacity: form.capacity.trim() ? Number(form.capacity) : null,
    };
    try {
      if (existing) {
        await api.put(`/appointments/${existing.id}`, body);
      } else {
        await api.post('/appointments', body);
      }
      emitDataChanged();
      goBack('/manage/appointments');
    } catch (e) {
      setErrors(fieldErrors(e));
      setMessage(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!existing) return;
    const ok = await confirmAction(
      'Brisanje termina',
      `Termin »${existing.name}« bo izbrisan iz urnika. Obstoječe rezervacije ostanejo v evidenci.`,
      'Izbriši',
      true,
    );
    if (!ok) return;
    setBusy('delete');
    try {
      await api.delete(`/appointments/${existing.id}`);
      emitDataChanged();
      goBack('/manage/appointments');
    } catch (e) {
      setMessage(errorMessage(e));
      setBusy(null);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <ScrollView contentContainerStyle={[screenStyles.content, padding]} keyboardShouldPersistTaps="handled">
          <SubHeader title={existing ? 'Uredi termin' : 'Nov termin'} back="/manage/appointments" />
          {message && <Notice tone="danger" text={message} />}

          <FormCard>
            <TextField label="Ime" value={form.name} onChangeText={(v) => set('name', v)} error={errors.name} />
            <SelectField
              label="Tip termina"
              valueLabel={typeName ?? 'Brez tipa'}
              onPress={() => setPicker('type')}
              error={errors.type}
            />
            <ToggleRow label="Aktiven" value={form.is_active} onValueChange={(v) => set('is_active', v)} />
          </FormCard>

          <FormCard title="Kdaj">
            <DaysField value={form} onToggle={(day) => set(day as keyof AppointmentDays, !form[day as keyof AppointmentDays])} error={errors.day_monday} />
            <TextField label="Začetek" value={form.start_time} onChangeText={(v) => set('start_time', v)} placeholder="17:00" keyboardType="numbers-and-punctuation" error={errors.start_time} />
            <TextField label="Konec" value={form.end_time} onChangeText={(v) => set('end_time', v)} placeholder="18:00" keyboardType="numbers-and-punctuation" error={errors.end_time} />
            <TextField
              label="Velja od (neobvezno)"
              value={form.valid_from}
              onChangeText={(v) => set('valid_from', v)}
              placeholder="15.11.2026"
              keyboardType="numbers-and-punctuation"
              error={errors.valid_from}
            />
            <TextField
              label="Velja do (neobvezno)"
              value={form.valid_to}
              onChangeText={(v) => set('valid_to', v)}
              placeholder="30.6.2027"
              keyboardType="numbers-and-punctuation"
              error={errors.valid_to}
            />
          </FormCard>

          <FormCard title="Prijave">
            <TextField
              label="Kapaciteta (prazno = brez omejitve)"
              value={form.capacity}
              onChangeText={(v) => set('capacity', v)}
              keyboardType="number-pad"
              error={errors.capacity}
            />
            <SelectField
              label="Ko je termin poln, se odpre (veriga)"
              valueLabel={nameOf(form.chained_next_appointment_id) ?? 'Brez'}
              onPress={() => setPicker('next')}
              error={errors.chained_next_appointment_id}
            />
            <SelectField
              label="Konji (prazno = vsi aktivni)"
              valueLabel={form.horse_ids.length ? data.horses.filter((h) => form.horse_ids.includes(h.id)).map((h) => h.name).join(', ') : 'Vsi konji'}
              onPress={() => setPicker('horses')}
              error={errors.horse_ids}
            />
            <SelectField
              label="Učitelji"
              valueLabel={form.teacher_ids.length ? data.teachers.filter((t) => form.teacher_ids.includes(t.id)).map((t) => t.name).join(', ') : 'Brez'}
              onPress={() => setPicker('teachers')}
              error={errors.teacher_ids}
            />
          </FormCard>

          {canSave && <Button title="Shrani" onPress={save} loading={busy === 'save'} disabled={!isOnline || busy !== null} />}
          {existing && data.can.delete && (
            <Button title="Izbriši termin" variant="danger" onPress={remove} loading={busy === 'delete'} disabled={!isOnline || busy !== null} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {picker === 'type' && (
        <PickerSheet
          title="Tip termina"
          items={[{ value: null, label: 'Brez tipa' }, ...data.types.map((t) => ({ value: t.id, label: t.name }))]}
          selected={form.type}
          onSelect={(v) => {
            set('type', v);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === 'next' && (
        <PickerSheet
          title="Naslednji termin v verigi"
          items={[
            { value: null, label: 'Brez' },
            ...chainCandidates.map((a) => ({ value: a.id, label: a.name, note: `${a.start_time ?? ''}–${a.end_time ?? ''}` })),
          ]}
          selected={form.chained_next_appointment_id}
          onSelect={(v) => {
            set('chained_next_appointment_id', v);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
          emptyText="Ni primernih terminov (aktivni, istega tipa)."
        />
      )}
      {picker === 'horses' && (
        <MultiPickerSheet
          title="Konji termina"
          items={data.horses.map((h) => ({ value: h.id, label: h.name }))}
          initial={form.horse_ids}
          hint="brez izbire = vsi"
          onDone={(v) => {
            set('horse_ids', v);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === 'teachers' && (
        <MultiPickerSheet
          title="Učitelji termina"
          items={data.teachers.map((t) => ({ value: t.id, label: t.name }))}
          initial={form.teacher_ids}
          onDone={(v) => {
            set('teacher_ids', v);
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
