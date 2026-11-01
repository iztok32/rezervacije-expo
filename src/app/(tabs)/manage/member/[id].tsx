import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { FormCard, SelectField } from '@/components/form';
import { Notice } from '@/components/notice';
import { OfflineBanner } from '@/components/offline-banner';
import { MultiPickerSheet } from '@/components/picker-sheet';
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
import { useSession } from '@/lib/session';
import type { MemberDetailResponse } from '@/lib/types';

export default function MemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const padding = useContentPadding();
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
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[screenStyles.content, padding]}>
        <SubHeader title={m?.name ?? 'Član'} back="/manage/members" />
        <OfflineBanner />
        {message && <Notice tone={message.ok ? 'success' : 'danger'} text={message.text} />}

        {!isOnline ? (
          <CenteredState message="Podatki člana so na voljo samo s povezavo." />
        ) : loading || error || !data || !m ? (
          <CenteredState loading={loading} message={loading ? undefined : (error ?? undefined)} />
        ) : (
          <>
            <FormCard>
              <ThemedText type="small" themeColor="textSecondary">
                {m.email}
              </ThemedText>
              {m.phone && (
                <Pressable onPress={() => Linking.openURL(`tel:${m.phone}`)} accessibilityRole="link">
                  <ThemedText type="linkPrimary">☎ {m.phone}</ThemedText>
                </Pressable>
              )}
              <ThemedText type="small">
                Prihajajočih rezervacij: {m.upcoming_reservations}
                {!m.is_active ? ' · neaktiven račun' : ''}
              </ThemedText>
            </FormCard>

            <FormCard title="Stanje kuponov">
              {data.coupon_types.map((t) => {
                const balance = m.coupon_balances[t.id] ?? 0;
                return (
                  <View key={t.id} style={styles.row}>
                    <ThemedText type="small" style={styles.flex}>
                      {t.name}
                    </ThemedText>
                    <ThemedText type="smallBold" style={balance < 0 && { color: theme.danger }}>
                      {balance}
                    </ThemedText>
                  </View>
                );
              })}
              {user?.permissions?.coupons_view_all && (
                <Button
                  title="Knjiga kuponov člana"
                  variant="secondary"
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
      </ScrollView>

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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
