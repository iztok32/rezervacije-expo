import Constants from 'expo-constants';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { HeroCountTile, HeroScreen, HeroTile, heroStyles, NotificationsButton } from '@/components/hero-screen';
import { Icon } from '@/components/icon';
import { OfflineBanner } from '@/components/offline-banner';
import { ThemeToggle } from '@/components/theme-toggle';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useHome } from '@/hooks/use-home';
import { useMyReservations } from '@/hooks/use-my-reservations';
import { useTheme } from '@/hooks/use-theme';
import { confirmAction } from '@/lib/dialogs';
import { useSession } from '@/lib/session';
import { openWebPage } from '@/lib/web-page';

type IconName = { ios: Parameters<typeof Icon>[0]['ios']; md: Parameters<typeof Icon>[0]['md'] };

/** Začetnici imena za znak računa (»Iztok Vozlič« → »IV«). */
function initials(name: string | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

/** »1 neprebrano«, »2 neprebrani«, »3 neprebrana«, »5 neprebranih«. */
function unreadLabel(n: number): string {
  const r = n % 100;
  const word = r === 1 ? 'neprebrano' : r === 2 ? 'neprebrani' : r === 3 || r === 4 ? 'neprebrana' : 'neprebranih';
  return `${n} ${word}`;
}

/** Profil v slogu »Domov«: račun, kuponi in rezervacije, povezave, videz in odjava. */
export default function ProfileScreen() {
  const { user, signOut } = useSession();
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const { home, reload } = useHome();
  const { items, refreshing, refresh } = useMyReservations();
  const unread = home?.unread_notifications ?? 0;
  const upcoming = items?.length ?? home?.upcoming_count ?? 0;
  const canBuy = !!user?.permissions?.purchase_view;

  async function logout() {
    if (await confirmAction('Odjava', 'Lokalno shranjene rezervacije bodo izbrisane s te naprave.', 'Odjava', true)) {
      signOut();
    }
  }

  return (
    <HeroScreen
      overline="Profil"
      title={user?.name ?? 'Profil'}
      actions={<NotificationsButton unread={unread} />}
      refreshing={refreshing}
      onRefresh={() => {
        refresh();
        reload();
      }}>
      <OfflineBanner />

      {/* ── Račun ─────────────────────────────────────────────────────── */}
      <HeroTile style={styles.account}>
        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
          <ThemedText style={[styles.avatarText, { color: theme.onPrimary }]}>{initials(user?.name)}</ThemedText>
        </View>
        <View style={styles.flex}>
          <ThemedText themeColor="textSecondary" style={heroStyles.meta}>
            Prijava z e-pošto
          </ThemedText>
          <ThemedText style={[heroStyles.tileTitle, styles.email]} numberOfLines={1}>
            {user?.email}
          </ThemedText>
          {user?.is_admin && (
            <View style={[styles.chip, { backgroundColor: theme.primarySoft }]}>
              <ThemedText style={[styles.chipText, { color: theme.primary }]}>Administrator</ThemedText>
            </View>
          )}
        </View>
      </HeroTile>

      <View style={heroStyles.row}>
        <HeroCountTile
          label="Kuponi"
          value={home ? home.coupons_available : '–'}
          link={canBuy ? 'Kupi več' : 'Podrobnosti'}
          onPress={() => router.navigate('/coupons')}
          onLink={canBuy ? () => router.push('/purchase') : undefined}
        />
        <HeroCountTile label="Prihajajoče" value={upcoming} link="Prikaži vse" onPress={() => router.push('/reservations')} />
      </View>

      {/* ── Povezave ──────────────────────────────────────────────────── */}
      <ThemedText style={[heroStyles.label, heroStyles.sectionLabel, { color: theme.primary }]}>Moj račun</ThemedText>
      <HeroTile style={styles.list}>
        <Row icon={{ ios: 'list.bullet', md: 'list' }} label="Moje rezervacije" onPress={() => router.push('/reservations')} />
        <Separator />
        <Row
          icon={{ ios: 'bell', md: 'notifications' }}
          label="Obvestila"
          detail={unread > 0 ? unreadLabel(unread) : undefined}
          highlight={unread > 0}
          onPress={() => router.push('/notifications')}
        />
        <Separator />
        <Row icon={{ ios: 'ticket', md: 'confirmation_number' }} label="Kuponi in zgodovina" onPress={() => router.navigate('/coupons')} />
        <Separator />
        <Row
          icon={{ ios: 'safari', md: 'open_in_new' }}
          label="Spletna stran kluba"
          detail="Nakupi, podatki računa"
          onPress={() => openWebPage('/dashboard')}
        />
      </HeroTile>

      <ThemedText style={[heroStyles.label, heroStyles.sectionLabel, { color: theme.primary }]}>Videz</ThemedText>
      <HeroTile style={styles.list}>
        <Row
          icon={dark ? { ios: 'moon.fill', md: 'dark_mode' } : { ios: 'sun.max.fill', md: 'light_mode' }}
          label="Temna tema"
          detail={dark ? 'Vklopljena' : 'Izklopljena'}
          right={<ThemeToggle />}
        />
      </HeroTile>

      {/* ── Odjava ────────────────────────────────────────────────────── */}
      <Pressable
        onPress={logout}
        accessibilityRole="button"
        style={({ pressed }) => [styles.logout, { backgroundColor: theme.backgroundElement }, pressed && heroStyles.pressed]}>
        <Icon ios="rectangle.portrait.and.arrow.right" md="logout" size={20} color={theme.danger} />
        <ThemedText style={[styles.logoutText, { color: theme.danger }]}>Odjava</ThemedText>
      </Pressable>

      <ThemedText themeColor="textSecondary" style={[heroStyles.meta, styles.version]}>
        KK Karlo · različica {Constants.expoConfig?.version ?? '—'}
      </ThemedText>
    </HeroScreen>
  );
}

/** Vrstica seznama: ikona v zaobljenem kvadratu, napis, opis in puščica (ali kontrolnik desno). */
function Row({
  icon,
  label,
  detail,
  highlight = false,
  right,
  onPress,
}: {
  icon: IconName;
  label: string;
  detail?: string;
  highlight?: boolean;
  right?: ReactNode;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const content = (
    <>
      <View style={[styles.rowIcon, { backgroundColor: highlight ? theme.primary : theme.backgroundSelected }]}>
        <Icon ios={icon.ios} md={icon.md} size={20} color={highlight ? theme.onPrimary : theme.textSecondary} />
      </View>
      <View style={styles.flex}>
        <ThemedText style={styles.rowLabel}>{label}</ThemedText>
        {detail && (
          <ThemedText style={[heroStyles.meta, { color: highlight ? theme.primary : theme.textSecondary }]}>{detail}</ThemedText>
        )}
      </View>
      {right ?? <Icon ios="chevron.right" md="chevron_right" size={18} color={theme.textSecondary} />}
    </>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.backgroundSelected }]}>
      {content}
    </Pressable>
  );
}

function Separator() {
  const theme = useTheme();
  return <View style={[styles.separator, { backgroundColor: theme.border }]} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  account: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, lineHeight: 24, fontWeight: 800 },
  email: { marginTop: 3 },
  chip: { alignSelf: 'flex-start', marginTop: Spacing.two, paddingHorizontal: Spacing.two, paddingVertical: 2, borderRadius: 8 },
  chipText: { fontSize: 11, lineHeight: 16, fontWeight: 700 },
  list: { padding: Spacing.one },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 60,
    paddingHorizontal: Spacing.three - Spacing.one,
    paddingVertical: Spacing.two,
    borderRadius: 16,
  },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 15, lineHeight: 20, fontWeight: 700 },
  separator: { height: 1, marginLeft: 66, marginRight: Spacing.three },
  logout: {
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: Spacing.one,
  },
  logoutText: { fontSize: 16, lineHeight: 20, fontWeight: 700 },
  version: { textAlign: 'center', marginTop: Spacing.one },
});
