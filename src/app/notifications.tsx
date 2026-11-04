import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { HeroEmpty, HeroScreen, HeroTile, heroStyles } from '@/components/hero-screen';
import { Icon } from '@/components/icon';
import { OfflineBanner } from '@/components/offline-banner';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useApi } from '@/hooks/use-api';
import { useTheme } from '@/hooks/use-theme';
import { api, errorMessage } from '@/lib/api';
import { useConnectivity } from '@/lib/connectivity';
import { emitDataChanged } from '@/lib/data-version';
import { addDays } from '@/lib/dates';
import { showMessage } from '@/lib/dialogs';
import type { InboxNotification, InboxResponse } from '@/lib/types';

/** »Imaš 2 neprebrani obvestili« — ednina, dvojina, množina in rodilnik po slovensko. */
function unreadTitle(n: number): string {
  const r = n % 100;
  if (r === 1) return `Imaš ${n} neprebrano obvestilo`;
  if (r === 2) return `Imaš ${n} neprebrani obvestili`;
  if (r === 3 || r === 4) return `Imaš ${n} neprebrana obvestila`;
  return `Imaš ${n} neprebranih obvestil`;
}

/** Danes ob 9:22, včeraj ob 9:22, 21. 9. ob 9:22 (leto le, če ni letošnje). */
function formatWhen(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const time = date.toLocaleTimeString('sl-SI', { hour: 'numeric', minute: '2-digit' });
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return `danes ob ${time}`;
  if (date.toDateString() === addDays(today, -1).toDateString()) return `včeraj ob ${time}`;
  const year = date.getFullYear() === today.getFullYear() ? '' : ` ${date.getFullYear()}`;
  return `${date.getDate()}. ${date.getMonth() + 1}.${year} ob ${time}`;
}

/** Nabiralnik obvestil na portalu (kot »Obvestila« na spletu) v slogu zavihka »Domov«. */
export default function NotificationsScreen() {
  const theme = useTheme();
  const { isOnline } = useConnectivity();
  const { data, error, loading, refreshing, refresh } = useApi<InboxResponse>(isOnline ? '/notifications' : null);
  const [busy, setBusy] = useState(false);
  // Neprebrana ob odprtju ostanejo v razdelku »Novo«, tudi ko jih uporabnik prebere — seznam ne poskakuje
  const [newIds, setNewIds] = useState<Set<number> | null>(null);
  if (data && newIds === null) {
    setNewIds(new Set(data.data.filter((n) => n.read_at === null).map((n) => n.id)));
  }

  const items = data?.data ?? [];
  const unread = data?.meta.unread ?? 0;
  const fresh = items.filter((n) => newIds?.has(n.id));
  const older = items.filter((n) => !newIds?.has(n.id));

  const title = !isOnline
    ? 'Obvestila niso na voljo'
    : !data
      ? 'Obvestila'
      : unread > 0
        ? unreadTitle(unread)
        : items.length > 0
          ? 'Vse je prebrano'
          : 'Ni novih obvestil';

  async function markAll() {
    setBusy(true);
    try {
      await api.post('/notifications/read-all');
      emitDataChanged();
    } catch (e) {
      showMessage('Ni uspelo', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <HeroScreen overline="Obvestila" title={title} back="/" refreshing={refreshing} onRefresh={isOnline ? refresh : undefined}>
      <OfflineBanner />

      {!isOnline ? (
        <HeroEmpty icon={{ ios: 'bell', md: 'notifications' }} title="Brez povezave" text="Obvestila se prikažejo, ko je vzpostavljena povezava s strežnikom." />
      ) : loading && !data ? (
        <ActivityIndicator color={theme.primary} style={styles.loading} />
      ) : error && !data ? (
        <HeroEmpty icon={{ ios: 'bell', md: 'notifications' }} title="Napaka pri nalaganju" text={error} />
      ) : items.length === 0 ? (
        <HeroEmpty icon={{ ios: 'bell', md: 'notifications' }} title="Ni obvestil" text="Tu se prikažejo sporočila kluba in učiteljev." />
      ) : (
        <>
          {unread > 0 && (
            <Pressable
              onPress={markAll}
              disabled={busy}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.markAll,
                { backgroundColor: theme.backgroundElement },
                (pressed || busy) && heroStyles.pressed,
              ]}>
              {busy ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <>
                  <Icon ios="checkmark.circle" md="done_all" size={20} color={theme.primary} />
                  <ThemedText style={[styles.markAllText, { color: theme.primary }]}>Označi vse kot prebrano</ThemedText>
                </>
              )}
            </Pressable>
          )}

          {fresh.length > 0 && <Section label="Novo" items={fresh} />}
          {older.length > 0 && <Section label={fresh.length > 0 ? 'Prej' : 'Vsa obvestila'} items={older} />}
        </>
      )}
    </HeroScreen>
  );
}

function Section({ label, items }: { label: string; items: InboxNotification[] }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <ThemedText style={[heroStyles.label, styles.sectionLabel, { color: theme.primary }]}>{label}</ThemedText>
      {items.map((n) => (
        <NotificationTile key={n.id} notification={n} />
      ))}
    </View>
  );
}

function NotificationTile({ notification: n }: { notification: InboxNotification }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState(n.read_at !== null);

  function toggle() {
    setOpen((o) => !o);
    if (!read) {
      setRead(true);
      // Neuspela oznaka ni pomembna — obvestilo ostane neprebrano na strežniku
      api.post(`/notifications/${n.id}/read`).then(emitDataChanged, () => setRead(false));
    }
  }

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${read ? '' : 'Neprebrano: '}${n.subject || 'Obvestilo'}, ${n.sender}`}
      style={({ pressed }) => pressed && heroStyles.pressed}>
      <HeroTile style={styles.tile}>
        <View style={[styles.iconCircle, { backgroundColor: read ? theme.backgroundSelected : theme.primary }]}>
          <Icon
            ios={read ? 'envelope.open' : 'bell.fill'}
            md={read ? 'drafts' : 'notifications'}
            size={20}
            color={read ? theme.textSecondary : theme.onPrimary}
          />
        </View>
        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <ThemedText style={[heroStyles.tileTitle, styles.flex]} numberOfLines={open ? undefined : 1}>
              {n.subject || 'Obvestilo'}
            </ThemedText>
            {!read && <View style={[styles.dot, { backgroundColor: theme.notifyDot }]} />}
          </View>
          <ThemedText themeColor="textSecondary" style={[heroStyles.meta, styles.meta]}>
            {n.sender} · {formatWhen(n.created_at)}
          </ThemedText>
          {n.message ? (
            <ThemedText
              themeColor={open ? 'text' : 'textSecondary'}
              style={[heroStyles.body, styles.message]}
              numberOfLines={open ? undefined : 2}>
              {n.message}
            </ThemedText>
          ) : null}
        </View>
      </HeroTile>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { paddingVertical: Spacing.five },
  markAll: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  markAllText: { fontSize: 15, lineHeight: 20, fontWeight: 700 },
  section: { gap: 10 },
  sectionLabel: { marginTop: Spacing.one, marginLeft: Spacing.one },
  tile: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  iconCircle: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 9, height: 9, borderRadius: 5 },
  meta: { marginTop: 3 },
  message: { marginTop: 6 },
});
