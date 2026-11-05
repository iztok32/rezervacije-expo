import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { fieldErrors, FieldError, FormCard, TextField, type FieldErrors } from '@/components/form';
import { HeroPrimaryButton, heroStyles } from '@/components/hero-screen';
import { Notice } from '@/components/notice';
import { Sheet } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, errorMessage } from '@/lib/api';
import { useConnectivity } from '@/lib/connectivity';
import { formatDate } from '@/lib/dates';
import type { NotifyChannel } from '@/lib/types';

const CHANNEL_LABELS: Record<NotifyChannel, string> = { portal: 'Portal', email: 'E-pošta', sms: 'SMS' };

export type NotifyTarget =
  | { kind: 'slot'; appointmentId: number; name: string; date: string; recipients: number }
  | { kind: 'day'; date: string; recipients: number };

/** Obvestilo vsem z rezervacijo na terminu ali dnevu — kot »Obvesti« v spletnem koledarju. */
export function NotifySheet({
  target,
  channels,
  onClose,
}: {
  target: NotifyTarget;
  channels: NotifyChannel[];
  onClose: () => void;
}) {
  const theme = useTheme();
  const { isOnline } = useConnectivity();
  const [channel, setChannel] = useState<NotifyChannel>(channels[0] ?? 'portal');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const date = formatDate(target.date, { weekday: 'long', day: 'numeric', month: 'long' });
  const what = target.kind === 'slot' ? `${target.name}, ${date}` : `Vsi termini: ${date}`;

  async function send() {
    setBusy(true);
    setErrors({});
    setResult(null);
    try {
      const body = { reservation_date: target.date, channel, subject: channel === 'sms' ? null : subject, message };
      const res = await api.post<{ message: string }>(
        target.kind === 'slot' ? '/notify/slot' : '/notify/day',
        target.kind === 'slot' ? { ...body, appointment_id: target.appointmentId } : body,
      );
      setResult({ ok: true, text: res.message });
      setSubject('');
      setMessage('');
    } catch (e) {
      setErrors(fieldErrors(e));
      setResult({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title="Obvestilo udeležencem" subtitle={`${what} · prejemnikov: ${target.recipients}`} onClose={onClose}>
      {result && <Notice tone={result.ok ? 'success' : 'danger'} text={result.text} />}
      {!isOnline && <Notice tone="warning" text="Brez povezave s strežnikom — pošiljanje ni mogoče." />}

      <FormCard title="Kanal">
        <View style={styles.channels} accessibilityRole="radiogroup">
          {channels.map((c) => {
            const on = channel === c;
            return (
              <Pressable
                key={c}
                onPress={() => setChannel(c)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                aria-checked={on}
                style={({ pressed }) => [
                  styles.channel,
                  { backgroundColor: on ? theme.primary : theme.backgroundSelected },
                  pressed && heroStyles.pressed,
                ]}>
                <ThemedText style={[styles.channelText, { color: on ? theme.onPrimary : theme.text }]}>{CHANNEL_LABELS[c]}</ThemedText>
              </Pressable>
            );
          })}
        </View>
        <FieldError text={errors.channel} />
      </FormCard>

      <FormCard title="Sporočilo">
        {channel !== 'sms' && <TextField label="Zadeva" value={subject} onChangeText={setSubject} error={errors.subject} />}
        <TextField
          label="Besedilo"
          value={message}
          onChangeText={setMessage}
          multiline
          error={errors.message ?? errors.notification}
          hint={channel === 'sms' ? `${message.length} znakov` : undefined}
        />
      </FormCard>

      <HeroPrimaryButton
        title={`Pošlji (${CHANNEL_LABELS[channel]})`}
        icon={{ ios: 'paperplane', md: 'send' }}
        onPress={send}
        loading={busy}
        disabled={!isOnline || !message.trim() || (channel !== 'sms' && !subject.trim())}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  channels: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  channel: { minHeight: 40, minWidth: 80, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  channelText: { fontSize: 14, lineHeight: 18, fontWeight: 700 },
});
