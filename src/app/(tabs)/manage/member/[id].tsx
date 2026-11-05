import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';

import { FormCard, SelectField } from '@/components/form';
import { HeroAvatar, HeroChipButton, HeroSeparator } from '@/components/hero-parts';
import { HeroEmpty, HeroScreen, HeroSecondaryButton, HeroTile, heroStyles } from '@/components/hero-screen';
import { Notice } from '@/components/notice';
import { OfflineBanner } from '@/components/offline-banner';
import { MultiPickerSheet } from '@/components/picker-sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useApi } from '@/hooks/use-api';
import { useTheme } from '@/hooks/use-theme';
import { api, errorMessage } from '@/lib/api';
import { useConnectivity } from '@/lib/connectivity';
import { emitDataChanged } from '@/lib/data-version';
import { useSession } from '@/lib/session';
import type { MemberDetailResponse } from '@/lib/types';

/** Podrobnosti člana: stik, stanje kuponov in dovoljeni tipi terminov. */
export default function MemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { user } = useSession();
  const { isOnline } = useConnectivity();
  const { data, error, loading } = useApi<MemberDetailResponse>(isOnline ? `/members/${id}` : null);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function saveTypes(ids: number[]) {
    setPicker(false);
    setBusy(true);
    setMessage(null);
    try {
      await api.put(`/members/${id}/appointment-types`, { appointment_type_ids: ids });
      setMessage({ ok: true, text: 'Dovoljeni tipi terminov so shranjeni.' });
      emitDataChanged();
    } catch (e) {
      setMessage({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  const m = data?.data;
  const allowed = data ? data.appointment_types.filter((t) => m?.appointment_type_ids.includes(t.id)).map((t) => t.name) : [];

  return (
    <HeroScreen overline="Član" title={m?.name ?? 'Član'} back="/manage/members">
      <OfflineBanner />
      {message && <Notice tone={message.ok ? 'success' : 'danger'} text={message.text} />}

      {!isOnline ? (
        <HeroEmpty icon={{ ios: 'wifi.slash', md: 'wifi_off' }} title="Brez povezave" text="Podatki člana so na voljo samo s povezavo." />
      ) : loading && !data ? (
        <ActivityIndicator color={theme.primary} style={styles.loading} />
      ) : error || !data || !m ? (
        <HeroEmpty icon={{ ios: 'person', md: 'person' }} title="Člana ni mogoče naložiti" text={error ?? 'Član ne obstaja.'} />
      ) : (
        <>
          <HeroTile style={styles.contact}>
            <View style={styles.row}>
              <HeroAvatar name={m.name} highlight size={56} />
              <View style={styles.flex}>
                <ThemedText themeColor="textSecondary" style={heroStyles.meta}>
                  E-pošta
                </ThemedText>
                <ThemedText style={heroStyles.tileTitle} numberOfLines={1}>
                  {m.email}
                </ThemedText>
              </View>
            </View>
            <View style={styles.chips}>
              {m.phone && (
                <HeroChipButton
                  label={m.phone}
                  icon={{ ios: 'phone', md: 'call' }}
                  onPress={() => Linking.openURL(`tel:${m.phone}`)}
                />
              )}
              <View style={[styles.stat, { backgroundColor: theme.primarySoft }]}>
                <ThemedText style={[styles.statText, { color: theme.primary }]}>Prihajajoče: {m.upcoming_reservations}</ThemedText>
              </View>
              {!m.is_active && (
                <View style={[styles.stat, { backgroundColor: theme.warningBackground }]}>
                  <ThemedText style={[styles.statText, { color: theme.warning }]}>Neaktiven račun</ThemedText>
                </View>
              )}
            </View>
          </HeroTile>

          <FormCard title="Stanje kuponov">
            <View>
              {data.coupon_types.map((t, i) => {
                const balance = m.coupon_balances[t.id] ?? 0;
                return (
                  <View key={t.id}>
                    {i > 0 && <HeroSeparator inset={0} />}
                    <View style={styles.balanceRow}>
                      <ThemedText style={[heroStyles.body, styles.flex]}>{t.name}</ThemedText>
                      <ThemedText style={[styles.balance, balance < 0 && { color: theme.danger }]}>{balance}</ThemedText>
                    </View>
                  </View>
                );
              })}
            </View>
            {user?.permissions?.coupons_view_all && (
              <HeroSecondaryButton
                title="Knjiga kuponov člana"
                icon={{ ios: 'list.bullet', md: 'list' }}
                onPress={() => router.push({ pathname: '/manage/coupons', params: { user_id: String(m.id), name: m.name } })}
              />
            )}
          </FormCard>

          <FormCard title="Dovoljeni tipi terminov">
            <SelectField
              label="Član lahko rezervira (prazno = vse)"
              valueLabel={allowed.length ? allowed.join(', ') : 'Vsi tipi terminov'}
              onPress={() => setPicker(true)}
              disabled={!data.can.edit || !isOnline || busy}
            />
          </FormCard>
        </>
      )}

      {picker && data && m && (
        <MultiPickerSheet
          title="Dovoljeni tipi terminov"
          items={data.appointment_types.map((t) => ({ value: t.id, label: t.name }))}
          initial={m.appointment_type_ids}
          hint="brez izbire = vsi"
          onDone={saveTypes}
          onClose={() => setPicker(false)}
        />
      )}
    </HeroScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { paddingVertical: Spacing.five },
  contact: { gap: Spacing.three - Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  stat: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12 },
  statText: { fontSize: 13, lineHeight: 18, fontWeight: 700 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 44 },
  balance: { fontSize: 18, lineHeight: 22, fontWeight: 800 },
});
