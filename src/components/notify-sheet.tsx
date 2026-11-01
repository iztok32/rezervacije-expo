import { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { fieldErrors, FieldError, FormCard, TextField, type FieldErrors } from '@/components/form';
import { Notice } from '@/components/notice';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
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
  const title = target.kind === 'slot' ? `${target.name}, ${date}` : `Vsi termini: ${date}`;

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
    <Modal
      visible
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={onClose}>
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <View style={styles.flex}>
              <ThemedText type="smallBold" style={styles.title}>
                Obvestilo udeležencem
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {title} · prejemnikov: {target.recipients}
              </ThemedText>
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
              <ThemedText type="linkPrimary">Zapri</ThemedText>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {result && <Notice tone={result.ok ? 'success' : 'danger'} text={result.text} />}
            {!isOnline && <Notice tone="warning" text="Brez povezave s strežnikom — pošiljanje ni mogoče." />}

            <FormCard>
              <View style={styles.channels}>
                {channels.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setChannel(c)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: channel === c }}
                    style={[styles.channel, { backgroundColor: channel === c ? theme.primary : theme.background }]}>
                    <ThemedText type="smallBold" style={channel === c && { color: '#fff' }}>
                      {CHANNEL_LABELS[c]}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
              <FieldError text={errors.channel} />

              {channel !== 'sms' && (
                <TextField label="Zadeva" value={subject} onChangeText={setSubject} error={errors.subject} />
              )}
              <TextField
                label="Sporočilo"
                value={message}
                onChangeText={setMessage}
                multiline
                error={errors.message ?? errors.notification}
                hint={channel === 'sms' ? `${message.length} znakov` : undefined}
              />

              <Button
                title={`Pošlji (${CHANNEL_LABELS[channel]})`}
                onPress={send}
                loading={busy}
                disabled={!isOnline || !message.trim() || (channel !== 'sms' && !subject.trim())}
              />
            </FormCard>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  title: { fontSize: 18 },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  channels: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  channel: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.two, minWidth: 72, alignItems: 'center' },
});
