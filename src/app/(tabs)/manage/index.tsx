import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { HeroIconBox, HeroSectionLabel, HeroSeparator } from '@/components/hero-parts';
import { HeroScreen, HeroTile, heroStyles, NotificationsButton, type IconName } from '@/components/hero-screen';
import { Icon } from '@/components/icon';
import { OfflineBanner } from '@/components/offline-banner';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useHome } from '@/hooks/use-home';
import { useTheme } from '@/hooks/use-theme';
import { manageItems } from '@/lib/manage-menu';
import { useSession } from '@/lib/session';

const ICONS: Record<string, IconName> = {
  '/manage/appointments': { ios: 'calendar', md: 'calendar_month' },
  '/manage/coupons': { ios: 'ticket', md: 'confirmation_number' },
  '/manage/members': { ios: 'person.2', md: 'group' },
};

/** Upravljanje (admin, učitelj) v slogu »Domov«: razdelki glede na pravice. */
export default function ManageScreen() {
  const { user } = useSession();
  const theme = useTheme();
  const { home } = useHome();
  const items = manageItems(user);

  return (
    <HeroScreen
      overline="Upravljanje"
      title="Urnik, kuponi in člani"
      actions={<NotificationsButton unread={home?.unread_notifications ?? 0} />}>
      <OfflineBanner />

      <HeroSectionLabel>Razdelki</HeroSectionLabel>
      <HeroTile style={styles.list}>
        {items.map((item, i) => (
          <View key={String(item.href)}>
            {i > 0 && <HeroSeparator />}
            <Pressable
              onPress={() => router.push(item.href)}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}: ${item.description}`}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.backgroundSelected }]}>
              <HeroIconBox icon={ICONS[String(item.href)] ?? { ios: 'gearshape', md: 'settings' }} highlight />
              <View style={styles.flex}>
                <ThemedText style={heroStyles.tileTitle}>{item.title}</ThemedText>
                <ThemedText themeColor="textSecondary" style={heroStyles.meta}>
                  {item.description}
                </ThemedText>
              </View>
              <Icon ios="chevron.right" md="chevron_right" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>
        ))}
      </HeroTile>

      <HeroTile style={styles.hint}>
        <Icon ios="info.circle" md="info" size={20} color={theme.primary} />
        <View style={styles.flex}>
          <ThemedText style={heroStyles.body}>
            Rezervacije za člane, odjave, konje, čakalne vrste in obvestila udeležencem urejaš v zavihku Termini.
          </ThemedText>
          <Pressable onPress={() => router.navigate('/calendar')} hitSlop={8} accessibilityRole="link">
            <ThemedText style={[styles.link, { color: theme.primary }]}>Odpri Termine</ThemedText>
          </Pressable>
        </View>
      </HeroTile>
    </HeroScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: Spacing.one },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 72,
    paddingHorizontal: Spacing.three - Spacing.one,
    paddingVertical: Spacing.three - Spacing.one,
    borderRadius: 16,
  },
  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three - Spacing.one },
  link: { marginTop: Spacing.two, fontSize: 14, lineHeight: 20, fontWeight: 700 },
});
