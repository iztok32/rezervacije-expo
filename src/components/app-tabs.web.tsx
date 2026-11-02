import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet, useWindowDimensions } from 'react-native';

import { Image } from 'expo-image';

import { CardShadow, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { manageItems } from '@/lib/manage-menu';
import { useSession } from '@/lib/session';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

// Pod to širino (telefon v brskalniku) skrajšamo napise, da vrstica ni širša od zaslona
const NARROW = 560;

export default function AppTabs() {
  const { user } = useSession();
  const { width } = useWindowDimensions();
  const canManage = manageItems(user).length > 0;

  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton>{width < NARROW ? 'Moje' : 'Moje rezervacije'}</TabButton>
          </TabTrigger>
          <TabTrigger name="calendar" href="/calendar" asChild>
            <TabButton>Termini</TabButton>
          </TabTrigger>
          {canManage && (
            <TabTrigger name="manage" href="/manage" asChild>
              <TabButton>Upravljanje</TabButton>
            </TabTrigger>
          )}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const theme = useTheme();
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <View style={[styles.tabButtonView, { backgroundColor: isFocused ? theme.primary : 'transparent' }]}>
        <ThemedText type="smallBold" style={{ color: isFocused ? theme.onPrimary : theme.textSecondary }}>
          {children}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const { width } = useWindowDimensions();
  const narrow = width < NARROW;
  return (
    <View {...props} style={[styles.tabListContainer, narrow && styles.tabListNarrow]}>
      <ThemedView type="backgroundElement" style={[styles.innerContainer, narrow && styles.innerNarrow]}>
        <View style={styles.brand}>
          <Image source={require('@/assets/images/brand/horse-mark.png')} style={styles.mark} contentFit="contain" />
          {!narrow && (
            <ThemedText type="smallBold" style={styles.brandText}>
              KK Karlo
            </ThemedText>
          )}
        </View>

        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingLeft: Spacing.four,
    paddingRight: Spacing.two,
    borderRadius: Radius.large,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.one,
    maxWidth: MaxContentWidth,
    boxShadow: CardShadow,
  },
  tabListNarrow: { padding: Spacing.two },
  innerNarrow: { paddingLeft: Spacing.three, paddingRight: Spacing.one },
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginRight: 'auto' },
  mark: { width: 30, height: 29 },
  brandText: { fontSize: 16, letterSpacing: 0.3 },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
  },
});
