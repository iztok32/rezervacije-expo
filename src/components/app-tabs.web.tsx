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

import { Icon } from '@/components/icon';

import { CardShadow, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { manageItems } from '@/lib/manage-menu';
import { useSession } from '@/lib/session';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

// Pod to širino (telefon v brskalniku) je vrstica spodaj z ikonami, kot v aplikaciji
export const NARROW = 560;

type TabIcon = { ios: Parameters<typeof Icon>[0]['ios']; md: Parameters<typeof Icon>[0]['md'] };

export default function AppTabs() {
  const { user } = useSession();
  const canManage = manageItems(user).length > 0;

  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon={{ ios: 'house', md: 'home' }}>Domov</TabButton>
          </TabTrigger>
          <TabTrigger name="calendar" href="/calendar" asChild>
            <TabButton icon={{ ios: 'calendar', md: 'calendar_month' }}>Termini</TabButton>
          </TabTrigger>
          <TabTrigger name="coupons" href="/coupons" asChild>
            <TabButton icon={{ ios: 'ticket', md: 'confirmation_number' }}>Kuponi</TabButton>
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton icon={{ ios: 'person.crop.circle', md: 'person' }}>Profil</TabButton>
          </TabTrigger>
          {canManage && (
            <TabTrigger name="manage" href="/manage" asChild>
              <TabButton icon={{ ios: 'gearshape', md: 'settings' }}>Upravljanje</TabButton>
            </TabTrigger>
          )}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, icon, ...props }: TabTriggerSlotProps & { icon?: TabIcon }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const narrow = width < NARROW && !!icon;
  const narrowColor = isFocused ? theme.primary : theme.textSecondary;
  return (
    <Pressable {...props} style={({ pressed }) => [narrow && styles.narrowButton, pressed && styles.pressed]}>
      {narrow && icon ? (
        <>
          <Icon ios={icon.ios} md={icon.md} color={narrowColor} />
          <ThemedText style={[styles.narrowLabel, { color: narrowColor }]} numberOfLines={1}>
            {children}
          </ThemedText>
        </>
      ) : (
        <View style={[styles.tabButtonView, { backgroundColor: isFocused ? theme.primary : 'transparent' }]}>
          <ThemedText type="smallBold" style={{ color: isFocused ? theme.onPrimary : theme.textSecondary }}>
            {children}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const { width } = useWindowDimensions();
  const narrow = width < NARROW;
  return (
    <View {...props} style={[styles.tabListContainer, narrow && styles.tabListNarrow]}>
      <ThemedView type="backgroundElement" style={[styles.innerContainer, narrow && styles.innerNarrow]}>
        {!narrow && (
          <View style={styles.brand}>
            <Image source={require('@/assets/images/brand/horse-mark.png')} style={styles.mark} contentFit="contain" />
            <ThemedText type="smallBold" style={styles.brandText}>
              KK Karlo
            </ThemedText>
          </View>
        )}

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
  // Spodnja vrstica na ozkem zaslonu (kot meni v predlogu »Ploščice«)
  tabListNarrow: { bottom: 0, padding: 0 },
  innerNarrow: { borderRadius: 0, paddingVertical: Spacing.one, paddingLeft: Spacing.one, paddingRight: Spacing.one, gap: 0, boxShadow: undefined },
  narrowButton: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 6 },
  narrowLabel: { fontSize: 11, lineHeight: 14, fontWeight: 700 },
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
