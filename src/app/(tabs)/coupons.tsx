import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import {
  HeroEmpty,
  HeroPrimaryButton,
  HeroScreen,
  HeroTile,
  heroStyles,
  NotificationsButton,
} from '@/components/hero-screen';
import { Icon } from '@/components/icon';
import { OfflineBanner } from '@/components/offline-banner';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useApi } from '@/hooks/use-api';
import { useHome } from '@/hooks/use-home';
import { useTheme } from '@/hooks/use-theme';
import { useConnectivity } from '@/lib/connectivity';
import { formatDate } from '@/lib/dates';
import { useSession } from '@/lib/session';
import type { CouponEntry, CouponsResponse } from '@/lib/types';
import { openWebPage } from '@/lib/web-page';

/** »Na voljo imaš 4 kupone« — ednina, dvojina, množina in rodilnik. */
function availableTitle(n: number): string {
  if (n <= 0) return 'Trenutno nimaš kuponov';
  const r = n % 100;
  const word = r === 1 ? 'kupon' : r === 2 ? 'kupona' : r === 3 || r === 4 ? 'kupone' : 'kuponov';
  return `Na voljo imaš ${n} ${word}`;
}

/** Zapisi po mesecih (strežnik jih vrne od najnovejšega). */
function groupByMonth(items: CouponEntry[]): { label: string; items: CouponEntry[] }[] {
  const groups: { label: string; items: CouponEntry[] }[] = [];
  for (const c of items) {
    const label = c.created_at
      ? new Date(c.created_at).toLocaleDateString('sl-SI', { month: 'long', year: 'numeric' })
      : 'Brez datuma';
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(c);
    else groups.push({ label, items: [c] });
  }
  return groups;
}

/** Moji kuponi v slogu »Domov«: stanje po tipih (tudi brez povezave), nakup na spletu in zgodovina. */
export default function MyCouponsScreen() {
  const { user } = useSession();
  const theme = useTheme();
  const { isOnline } = useConnectivity();
  const { home, reload } = useHome();
  // Admin vidi knjigo vseh — tu vedno samo lastne zapise
  const { data, error, loading, refreshing, refresh } = useApi<CouponsResponse>(
    isOnline && user ? `/coupons?user_id=${user.id}` : null,
  );
  const canBuy = !!user?.permissions?.purchase_view;
  const balances = home?.coupon_balances ?? [];
  const entries = data?.data ?? [];

  return (
    <HeroScreen
      overline="Kuponi"
      title={home ? availableTitle(home.coupons_available) : 'Moji kuponi'}
      actions={<NotificationsButton unread={home?.unread_notifications ?? 0} />}
      refreshing={refreshing}
      onRefresh={() => {
        refresh();
        reload();
      }}>
      <OfflineBanner />

      {/* ── Stanje po tipih ───────────────────────────────────────────── */}
      {balances.length > 0 ? (
        <View style={styles.balances}>
          {balances.map((b) => (
            <HeroTile key={b.id} style={styles.balance}>
              <ThemedText themeColor="textSecondary" style={styles.balanceLabel} numberOfLines={2}>
                {b.name}
              </ThemedText>
              <ThemedText style={[styles.balanceValue, b.balance < 0 && { color: theme.danger }]}>{b.balance}</ThemedText>
              <ThemedText style={[heroStyles.meta, { color: b.balance < 0 ? theme.danger : theme.textSecondary }]}>
                {b.balance < 0 ? 'Poravnaj pri klubu' : b.balance === 0 ? 'Porabljeno' : 'Na voljo'}
              </ThemedText>
            </HeroTile>
          ))}
        </View>
      ) : (
        <HeroEmpty
          icon={{ ios: 'ticket', md: 'confirmation_number' }}
          title={home ? 'Še nimaš kuponov' : 'Stanje še ni preneseno'}
          text={
            home
              ? 'Kupon potrebuješ za rezervacijo ure. Kupiš ga lahko na spletni strani kluba.'
              : 'Stanje kuponov se prikaže, ko je vzpostavljena povezava.'
          }
        />
      )}

      {canBuy && (
        <View style={styles.buy}>
          <HeroPrimaryButton
            title="Kupi kupone"
            icon={{ ios: 'cart', md: 'shopping_cart' }}
            onPress={() => router.push('/purchase')}
          />
          <ThemedText themeColor="textSecondary" style={[heroStyles.meta, styles.center]}>
            Nakup poteka na spletni strani kluba.
          </ThemedText>
        </View>
      )}

      {/* ── Zgodovina ─────────────────────────────────────────────────── */}
      {!isOnline ? (
        <HeroTile>
          <ThemedText themeColor="textSecondary" style={[heroStyles.body, styles.center]}>
            Zgodovina nakupov in porabe je na voljo, ko je vzpostavljena povezava.
          </ThemedText>
        </HeroTile>
      ) : loading && !data ? (
        <ActivityIndicator color={theme.primary} style={styles.loading} />
      ) : error && !data ? (
        <HeroTile>
          <ThemedText themeColor="textSecondary" style={[heroStyles.body, styles.center]}>
            {error}
          </ThemedText>
        </HeroTile>
      ) : entries.length === 0 ? null : (
        <>
          {groupByMonth(entries).map((group, gi) => (
            <View key={group.label} style={styles.section}>
              <ThemedText style={[heroStyles.label, heroStyles.sectionLabel, { color: theme.primary }]}>
                {gi === 0 ? `Zgodovina · ${group.label}` : group.label}
              </ThemedText>
              <HeroTile style={styles.list}>
                {group.items.map((c, i) => (
                  <View key={c.id}>
                    {i > 0 && <View style={[styles.separator, { backgroundColor: theme.border }]} />}
                    <EntryRow entry={c} />
                  </View>
                ))}
              </HeroTile>
            </View>
          ))}

          {(data?.meta.last_page ?? 1) > 1 && (
            <Pressable onPress={() => openWebPage('/coupons')} accessibilityRole="link" style={styles.more}>
              <ThemedText themeColor="textSecondary" style={[heroStyles.meta, styles.center]}>
                Prikazanih je zadnjih {entries.length} zapisov.{' '}
                <ThemedText style={[heroStyles.meta, { color: theme.primary }]}>Celotna zgodovina na spletu</ThemedText>
              </ThemedText>
            </Pressable>
          )}
        </>
      )}
    </HeroScreen>
  );
}

function EntryRow({ entry: c }: { entry: CouponEntry }) {
  const theme = useTheme();
  const purchase = c.transaction_type === 'purchase';
  const color = purchase ? theme.success : theme.danger;
  const detail = c.reservation
    ? [c.reservation.appointment, c.reservation.date && formatDate(c.reservation.date, { day: 'numeric', month: 'numeric' })]
        .filter(Boolean)
        .join(', ')
    : null;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${purchase ? 'Nakup' : 'Poraba'} ${c.quantity}, ${c.coupon_type?.name ?? ''}`}>
      <View style={[styles.rowIcon, { backgroundColor: purchase ? theme.successSoft : theme.primarySoft }]}>
        <Icon ios={purchase ? 'plus' : 'minus'} md={purchase ? 'add' : 'remove'} size={20} color={color} />
      </View>
      <View style={styles.flex}>
        <ThemedText style={styles.rowTitle} numberOfLines={1}>
          {purchase ? 'Nakup' : 'Poraba'} · {c.coupon_type?.name ?? '—'}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={heroStyles.meta} numberOfLines={2}>
          {[c.created_at && new Date(c.created_at).toLocaleDateString('sl-SI'), detail].filter(Boolean).join(' · ')}
        </ThemedText>
        {c.notes && (
          <ThemedText themeColor="textSecondary" style={[heroStyles.body, styles.notes]}>
            {c.notes}
          </ThemedText>
        )}
      </View>
      <ThemedText style={[styles.qty, { color }]}>
        {purchase ? '+' : '−'}
        {c.quantity}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  loading: { paddingVertical: Spacing.five },
  balances: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  balance: { flexGrow: 1, flexBasis: 140, gap: 6 },
  balanceLabel: { fontSize: 12, lineHeight: 16, fontWeight: 700 },
  balanceValue: { fontSize: 34, lineHeight: 38, fontWeight: 800 },
  buy: { gap: Spacing.two },
  section: { gap: 10 },
  list: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: Spacing.three - Spacing.one, paddingHorizontal: Spacing.three - Spacing.one },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15, lineHeight: 20, fontWeight: 700 },
  notes: { marginTop: 2 },
  qty: { fontSize: 20, lineHeight: 24, fontWeight: 800, minWidth: 36, textAlign: 'right' },
  separator: { height: 1, marginLeft: 66, marginRight: Spacing.three },
  more: { paddingVertical: Spacing.two },
});
