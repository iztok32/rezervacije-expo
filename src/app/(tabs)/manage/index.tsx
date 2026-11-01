import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { OfflineBanner } from '@/components/offline-banner';
import { ScreenHeader, screenStyles, useContentPadding } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { manageItems } from '@/lib/manage-menu';
import { useSession } from '@/lib/session';

export default function ManageScreen() {
  const { user } = useSession();
  const padding = useContentPadding();
  const items = manageItems(user);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[screenStyles.content, padding]}>
        <ScreenHeader title="Upravljanje" />
        <OfflineBanner />

        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          Rezervacije za člane, odjave, konje, čakalne vrste in obvestila udeležencem urejaš v zavihku »Termini«.
        </ThemedText>

        {items.map((item) => (
          <Link key={String(item.href)} href={item.href} asChild>
            <Pressable accessibilityRole="button">
              {({ pressed }) => (
                <ThemedView type="backgroundElement" style={[screenStyles.card, styles.item, pressed && { opacity: 0.7 }]}>
                  <View style={styles.flex}>
                    <ThemedText type="smallBold">{item.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.description}
                    </ThemedText>
                  </View>
                  <ThemedText themeColor="textSecondary">›</ThemedText>
                </ThemedView>
              )}
            </Pressable>
          </Link>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  hint: { marginBottom: Spacing.two },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 64 },
});
