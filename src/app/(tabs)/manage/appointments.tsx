import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { dayNames } from '@/components/form';
import { Notice } from '@/components/notice';
import { OfflineBanner } from '@/components/offline-banner';
import { CenteredState, screenStyles, useContentPadding } from '@/components/screen';
import { SubHeader } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useApi } from '@/hooks/use-api';
import { useTheme } from '@/hooks/use-theme';
import { api, errorMessage } from '@/lib/api';
import { useConnectivity } from '@/lib/connectivity';
import { emitDataChanged } from '@/lib/data-version';
import { formatTimeRange, toDateString, toUserDate } from '@/lib/dates';
import type { Appointment, AppointmentsResponse } from '@/lib/types';

type Filter = 'active' | 'all';

export default function AppointmentsScreen() {
  const padding = useContentPadding();
  const theme = useTheme();
  const { isOnline } = useConnectivity();
  const { data, error, loading, refreshing, refresh } = useApi<AppointmentsResponse>(isOnline ? '/appointments' : null);
  const [filter, setFilter] = useState<Filter>('active');
  const [order, setOrder] = useState<Appointment[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const today = toDateString(new Date());
  const typeName = (id: number | null) => data?.types.find((t) => t.id === id)?.name;
  const nameOf = (id: number | null) => data?.data.find((a) => a.id === id)?.name;
  const list = order ?? (data?.data ?? []).filter((a) => filter === 'all' || (a.is_active && !(a.valid_to && a.valid_to < today)));

  function move(index: number, delta: number) {
    if (!order) return;
    const next = [...order];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    setOrder(next);
  }

  async function saveOrder() {
    if (!order) return;
    setSaving(true);
    try {
      await api.post('/appointments/reorder', { ids: order.map((a) => a.id) });
      setOrder(null);
      setMessage({ ok: true, text: 'Vrstni red je shranjen.' });
      emitDataChanged();
    } catch (e) {
      setMessage({ ok: false, text: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[screenStyles.content, padding]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <SubHeader
          title="Termini"
          right={
            data?.can.create && !order ? (
              <Pressable onPress={() => router.push('/manage/appointment/new')} hitSlop={8} accessibilityRole="button">
                <ThemedText type="linkPrimary">+ Nov</ThemedText>
              </Pressable>
            ) : null
          }
        />
        <OfflineBanner />
        {message && <Notice tone={message.ok ? 'success' : 'danger'} text={message.text} />}

        {data && (
          <View style={styles.toolbar}>
            {order ? (
              <>
                <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
                  Premikaj s puščicami, nato shrani.
                </ThemedText>
                <Pressable onPress={() => setOrder(null)} hitSlop={8} accessibilityRole="button">
                  <ThemedText type="linkPrimary">Prekliči</ThemedText>
                </Pressable>
              </>
            ) : (
              <>
                {(['active', 'all'] as Filter[]).map((f) => (
                  <Pressable
                    key={f}
                    onPress={() => setFilter(f)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: filter === f }}
                    style={[styles.filter, { backgroundColor: filter === f ? theme.backgroundSelected : theme.backgroundElement }]}>
                    <ThemedText type="small">{f === 'active' ? 'Veljavni' : 'Vsi'}</ThemedText>
                  </Pressable>
                ))}
                <View style={styles.flex} />
                {data.can.edit && (
                  <Pressable onPress={() => setOrder(data.data)} hitSlop={8} accessibilityRole="button">
                    <ThemedText type="linkPrimary">Vrstni red</ThemedText>
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}

        {!isOnline ? (
          <CenteredState message="Upravljanje je na voljo samo s povezavo." />
        ) : loading || error || list.length === 0 ? (
          <CenteredState loading={loading} message={loading ? undefined : (error ?? 'Ni terminov.')} />
        ) : (
          list.map((a, index) => {
            const expired = !!a.valid_to && a.valid_to < today;
            const card = (
              <ThemedView type="backgroundElement" style={[screenStyles.card, !a.is_active && { opacity: 0.6 }]}>
                <View style={styles.row}>
                  <ThemedText type="smallBold" style={styles.flex}>
                    {a.name}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatTimeRange(a.start_time, a.end_time)}
                  </ThemedText>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {[dayNames(a), typeName(a.type), a.capacity ? `${a.capacity} mest` : 'brez omejitve'].filter(Boolean).join(' · ')}
                </ThemedText>
                {(a.valid_from || a.valid_to) && (
                  <ThemedText type="small" themeColor="textSecondary">
                    Velja: {a.valid_from ? toUserDate(a.valid_from) : '…'} – {a.valid_to ? toUserDate(a.valid_to) : '…'}
                  </ThemedText>
                )}
                {a.chained_next_appointment_id && (
                  <ThemedText type="small" themeColor="textSecondary">
                    Ko je poln, se odpre: {nameOf(a.chained_next_appointment_id)}
                  </ThemedText>
                )}
                {(!a.is_active || expired) && (
                  <ThemedText type="smallBold" style={{ color: theme.warning }}>
                    {!a.is_active ? 'Neaktiven' : 'Potekel'}
                  </ThemedText>
                )}
                {order && (
                  <View style={styles.row}>
                    <Button title="↑" variant="secondary" onPress={() => move(index, -1)} disabled={index === 0} />
                    <Button title="↓" variant="secondary" onPress={() => move(index, 1)} disabled={index === list.length - 1} />
                  </View>
                )}
              </ThemedView>
            );
            return order ? (
              <View key={a.id}>{card}</View>
            ) : (
              <Link key={a.id} href={`/manage/appointment/${a.id}`} asChild>
                <Pressable accessibilityRole="button">{card}</Pressable>
              </Link>
            );
          })
        )}

        {order && <Button title="Shrani vrstni red" onPress={saveOrder} loading={saving} disabled={!isOnline} />}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.one },
  filter: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: Spacing.three },
});
