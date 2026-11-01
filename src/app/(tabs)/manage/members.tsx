import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { OfflineBanner } from '@/components/offline-banner';
import { CenteredState, screenStyles, useContentPadding } from '@/components/screen';
import { SubHeader } from '@/components/sheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useMemberSearch } from '@/hooks/use-member-search';
import { useTheme } from '@/hooks/use-theme';
import { useConnectivity } from '@/lib/connectivity';

export default function MembersScreen() {
  const padding = useContentPadding();
  const theme = useTheme();
  const { isOnline } = useConnectivity();
  const { members, loading, search } = useMemberSearch(isOnline);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[screenStyles.content, padding]} keyboardShouldPersistTaps="handled">
        <SubHeader title="Člani" />
        <OfflineBanner />
        <TextInput
          onChangeText={search}
          placeholder="Išči po imenu ali e-pošti…"
          placeholderTextColor={theme.textSecondary}
          autoCorrect={false}
          style={[styles.search, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />
        {!isOnline ? (
          <CenteredState message="Člani so na voljo samo s povezavo." />
        ) : members.length === 0 ? (
          <CenteredState loading={loading} message={loading ? undefined : 'Ni najdenih članov.'} />
        ) : (
          members.map((m) => (
            <Link key={m.id} href={`/manage/member/${m.id}`} asChild>
              <Pressable accessibilityRole="button">
                {({ pressed }) => (
                  <ThemedView type="backgroundElement" style={[screenStyles.card, styles.row, pressed && { opacity: 0.7 }]}>
                    <View style={styles.flex}>
                      <ThemedText type="smallBold">{m.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {[m.email, m.phone].filter(Boolean).join(' · ')}
                      </ThemedText>
                    </View>
                    <ThemedText themeColor="textSecondary">›</ThemedText>
                  </ThemedView>
                )}
              </Pressable>
            </Link>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  search: { borderRadius: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, fontSize: 16 },
});
