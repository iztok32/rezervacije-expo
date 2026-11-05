import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { HeroAvatar, HeroSearch, HeroSectionLabel, HeroSeparator } from '@/components/hero-parts';
import { HeroEmpty, HeroScreen, HeroTile, heroStyles } from '@/components/hero-screen';
import { Icon } from '@/components/icon';
import { OfflineBanner } from '@/components/offline-banner';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useMemberSearch } from '@/hooks/use-member-search';
import { useTheme } from '@/hooks/use-theme';
import { useConnectivity } from '@/lib/connectivity';

/** Člani: iskanje po imenu ali e-pošti, odpre podrobnosti člana. */
export default function MembersScreen() {
  const theme = useTheme();
  const { isOnline } = useConnectivity();
  const { members, loading, search } = useMemberSearch(isOnline);

  return (
    <HeroScreen
      overline="Upravljanje"
      title="Člani"
      back="/manage"
      headerExtra={isOnline ? <HeroSearch onChangeText={search} placeholder="Išči po imenu ali e-pošti…" /> : undefined}>
      <OfflineBanner />

      {!isOnline ? (
        <HeroEmpty icon={{ ios: 'wifi.slash', md: 'wifi_off' }} title="Brez povezave" text="Člani so na voljo samo s povezavo." />
      ) : loading && members.length === 0 ? (
        <ActivityIndicator color={theme.primary} style={styles.loading} />
      ) : members.length === 0 ? (
        <HeroEmpty icon={{ ios: 'person.2', md: 'group' }} title="Ni najdenih članov" text="Poskusi z drugim imenom ali e-poštnim naslovom." />
      ) : (
        <View style={styles.section}>
          <HeroSectionLabel>{`Zadetki (${members.length})`}</HeroSectionLabel>
          <HeroTile style={styles.list}>
            {members.map((m, i) => (
              <View key={m.id}>
                {i > 0 && <HeroSeparator inset={60} />}
                <Pressable
                  onPress={() => router.push(`/manage/member/${m.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={m.name}
                  style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.backgroundSelected }]}>
                  <HeroAvatar name={m.name} />
                  <View style={styles.flex}>
                    <ThemedText style={styles.name} numberOfLines={1}>
                      {m.name}
                    </ThemedText>
                    <ThemedText themeColor="textSecondary" style={heroStyles.meta} numberOfLines={1}>
                      {[m.email, m.phone].filter(Boolean).join(' · ')}
                    </ThemedText>
                  </View>
                  <Icon ios="chevron.right" md="chevron_right" size={18} color={theme.textSecondary} />
                </Pressable>
              </View>
            ))}
          </HeroTile>
        </View>
      )}
    </HeroScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { paddingVertical: Spacing.five },
  section: { gap: 10 },
  list: { padding: Spacing.one },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - Spacing.one,
    minHeight: 60,
    paddingHorizontal: Spacing.three - Spacing.one,
    paddingVertical: Spacing.two + Spacing.half,
    borderRadius: 14,
  },
  name: { fontSize: 15, lineHeight: 20, fontWeight: 700 },
});
