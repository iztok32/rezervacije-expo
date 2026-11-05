import { Link, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { dayNames } from '@/components/form';
import { HeroChipButton, HeroSectionLabel, HeroSegmented } from '@/components/hero-parts';
import { HeroEmpty, HeroPrimaryButton, HeroScreen, HeroSecondaryButton, HeroTile, heroStyles } from '@/components/hero-screen';
import { Icon } from '@/components/icon';
import { Notice } from '@/components/notice';
import { OfflineBanner } from '@/components/offline-banner';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useApi } from '@/hooks/use-api';
import { useTheme } from '@/hooks/use-theme';
import { api, errorMessage } from '@/lib/api';
import { useConnectivity } from '@/lib/connectivity';
import { emitDataChanged } from '@/lib/data-version';
import { toDateString, toUserDate } from '@/lib/dates';
import type { Appointment, AppointmentsResponse } from '@/lib/types';

type Filter = 'active' | 'all';

/** Urnik terminov: seznam, filter veljavnih, vrstni red in nov termin. */
export default function AppointmentsScreen() {
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
    <HeroScreen
      overline="Upravljanje"
      title={order ? 'Vrstni red terminov' : 'Termini (urnik)'}
      back="/manage"
      refreshing={refreshing}
      onRefresh={isOnline ? refresh : undefined}
      headerExtra={
        data && !order ? (
          <HeroSegmented
            label="Prikaži"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'active', label: 'Veljavni' },
              { value: 'all', label: 'Vsi' },
            ]}
          />
        ) : undefined
      }>
      <OfflineBanner />
      {message && <Notice tone={message.ok ? 'success' : 'danger'} text={message.text} />}

      {!isOnline ? (
        <HeroEmpty icon={{ ios: 'wifi.slash', md: 'wifi_off' }} title="Brez povezave" text="Upravljanje je na voljo samo s povezavo." />
      ) : loading && !data ? (
        <ActivityIndicator color={theme.primary} style={styles.loading} />
      ) : error && !data ? (
        <HeroEmpty icon={{ ios: 'calendar', md: 'calendar_month' }} title="Napaka pri nalaganju" text={error} />
      ) : (
        <>
          {order ? (
            <Notice tone="warning" text="Premikaj termine s puščicami, nato shrani vrstni red." />
          ) : (
            <View style={styles.actions}>
              {data?.can.create && (
                <View style={styles.flex}>
                  <HeroPrimaryButton
                    title="Nov termin"
                    icon={{ ios: 'plus', md: 'add' }}
                    onPress={() => router.push('/manage/appointment/new')}
                  />
                </View>
              )}
              {data?.can.edit && (
                <View style={styles.flex}>
                  <HeroSecondaryButton
                    title="Vrstni red"
                    icon={{ ios: 'arrow.up.arrow.down', md: 'swap_vert' }}
                    onPress={() => setOrder(data.data)}
                  />
                </View>
              )}
            </View>
          )}

          {list.length === 0 ? (
            <HeroEmpty icon={{ ios: 'calendar', md: 'calendar_month' }} title="Ni terminov" text="Dodaj nov termin ali prikaži vse termine." />
          ) : (
            <View style={styles.section}>
              <HeroSectionLabel>{`${list.length} ${order ? 'v vrstnem redu' : filter === 'active' ? 'veljavnih' : 'skupaj'}`}</HeroSectionLabel>
              {list.map((a, index) => {
                const expired = !!a.valid_to && a.valid_to < today;
                const tile = (
                  <HeroTile style={[styles.tile, !a.is_active && styles.inactive]}>
                    <View style={[styles.timeBox, { backgroundColor: theme.backgroundSelected }]}>
                      <ThemedText style={styles.timeStart}>{a.start_time ?? '—'}</ThemedText>
                      {a.end_time && (
                        <ThemedText themeColor="textSecondary" style={styles.timeEnd}>
                          {a.end_time}
                        </ThemedText>
                      )}
                    </View>
                    <View style={styles.body}>
                      <ThemedText style={heroStyles.tileTitle} numberOfLines={2}>
                        {a.name}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary" style={heroStyles.meta}>
                        {[dayNames(a), typeName(a.type), a.capacity ? `${a.capacity} mest` : 'brez omejitve'].filter(Boolean).join(' · ')}
                      </ThemedText>
                      {(a.valid_from || a.valid_to) && (
                        <ThemedText themeColor="textSecondary" style={heroStyles.meta}>
                          Velja: {a.valid_from ? toUserDate(a.valid_from) : '…'} – {a.valid_to ? toUserDate(a.valid_to) : '…'}
                        </ThemedText>
                      )}
                      {a.chained_next_appointment_id && (
                        <ThemedText themeColor="textSecondary" style={heroStyles.meta}>
                          Ko je poln, se odpre: {nameOf(a.chained_next_appointment_id)}
                        </ThemedText>
                      )}
                      {(!a.is_active || expired) && (
                        <View style={[styles.badge, { backgroundColor: theme.warningBackground }]}>
                          <ThemedText style={[styles.badgeText, { color: theme.warning }]}>{!a.is_active ? 'Neaktiven' : 'Potekel'}</ThemedText>
                        </View>
                      )}
                    </View>
                    {order ? (
                      <View style={styles.arrows}>
                        <HeroChipButton
                          label="Gor"
                          icon={{ ios: 'chevron.up', md: 'expand_less' }}
                          onPress={() => move(index, -1)}
                          disabled={index === 0}
                        />
                        <HeroChipButton
                          label="Dol"
                          icon={{ ios: 'chevron.down', md: 'expand_more' }}
                          onPress={() => move(index, 1)}
                          disabled={index === list.length - 1}
                        />
                      </View>
                    ) : (
                      <Icon ios="chevron.right" md="chevron_right" size={18} color={theme.textSecondary} />
                    )}
                  </HeroTile>
                );
                return order ? (
                  <View key={a.id}>{tile}</View>
                ) : (
                  <Link key={a.id} href={`/manage/appointment/${a.id}`} asChild>
                    <Pressable accessibilityRole="button" accessibilityLabel={`${a.start_time ?? ''} ${a.name}`} style={({ pressed }) => pressed && heroStyles.pressed}>
                      {tile}
                    </Pressable>
                  </Link>
                );
              })}
            </View>
          )}

          {order && (
            <>
              <HeroPrimaryButton title="Shrani vrstni red" icon={{ ios: 'checkmark', md: 'check' }} onPress={saveOrder} loading={saving} disabled={!isOnline} />
              <HeroSecondaryButton title="Prekliči" onPress={() => setOrder(null)} disabled={saving} />
            </>
          )}
        </>
      )}
    </HeroScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { paddingVertical: Spacing.five },
  actions: { flexDirection: 'row', gap: 12 },
  section: { gap: 10 },
  tile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  inactive: { opacity: 0.65 },
  timeBox: { width: 60, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  timeStart: { fontSize: 16, lineHeight: 20, fontWeight: 800 },
  timeEnd: { fontSize: 11, lineHeight: 14, fontWeight: 600 },
  body: { flex: 1, gap: 3 },
  badge: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 11, lineHeight: 16, fontWeight: 700 },
  arrows: { gap: 6 },
});
