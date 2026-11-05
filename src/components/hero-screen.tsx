import { Image } from 'expo-image';
import { router, useIsFocused, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { useContentPadding } from '@/components/screen';
import { goBack } from '@/lib/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type IconName = { ios: Parameters<typeof Icon>[0]['ios']; md: Parameters<typeof Icon>[0]['md'] };

/**
 * Postavitev zaslonov v slogu »Domov« (predlog C »Ploščice«): temna glava z nadnaslovom in
 * velikim naslovom, spodaj svetel del z zaobljenimi ploščicami (HeroTile).
 * back: gumb nazaj levo zgoraj (podzasloni); brez njega je levo znak kluba.
 * headerExtra: dodatna vsebina v temni glavi pod naslovom (npr. izbira dneva).
 * compact: manjši naslov (npr. Termini, kjer je v glavi še koledar).
 * onClose: celozaslonsko podokno (Modal) — levo gumb »Zapri«, odmiki brez spodnjih zavihkov.
 */
export function HeroScreen({
  overline,
  title,
  back,
  onClose,
  compact = false,
  actions,
  headerExtra,
  refreshing = false,
  onRefresh,
  children,
}: {
  overline?: string;
  title: string;
  back?: Href;
  onClose?: () => void;
  compact?: boolean;
  actions?: ReactNode;
  headerExtra?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  children: ReactNode;
}) {
  const theme = useTheme();
  const tabPadding = useContentPadding();
  const insets = useSafeAreaInsets();
  // V podoknu ni zavihkov; na iOS je podokno »pageSheet« pod vrstico stanja
  const padding = onClose
    ? {
        paddingTop: Platform.OS === 'ios' ? Spacing.three : insets.top + Spacing.three,
        paddingBottom: insets.bottom + Spacing.five,
      }
    : tabPadding;
  // Zavihki ostanejo naloženi — svetle ikone vrstice stanja samo na odprtem zaslonu
  const focused = useIsFocused();

  return (
    <View style={[styles.flex, { backgroundColor: theme.hero }]}>
      {(focused || onClose) && <StatusBar style="light" />}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.heroText} /> : undefined
        }>
        <View style={[styles.header, { paddingTop: padding.paddingTop }]}>
          <View style={styles.topRow}>
            {onClose ? (
              <HeroButton label="Zapri" onPress={onClose}>
                <Icon ios="xmark" md="close" size={20} color={theme.heroText} />
              </HeroButton>
            ) : back ? (
              <HeroButton label="Nazaj" onPress={() => goBack(back)}>
                <Icon ios="chevron.left" md="arrow_back" size={20} color={theme.heroText} />
              </HeroButton>
            ) : (
              <View style={styles.brand}>
                <View style={styles.logoPlate}>
                  <Image source={require('@/assets/images/brand/horse-mark.png')} style={styles.logo} contentFit="contain" />
                </View>
                <ThemedText style={[styles.brandText, { color: theme.heroText }]}>KK KARLO</ThemedText>
              </View>
            )}
            <View style={styles.actions}>
              <ThemeToggle onDark />
              {actions}
            </View>
          </View>
          <View>
            {overline && <ThemedText style={[styles.overline, { color: theme.heroMuted }]}>{overline}</ThemedText>}
            <ThemedText accessibilityRole="header" style={[styles.title, compact && styles.titleCompact, !overline && styles.titleAlone, { color: theme.heroText }]}>
              {title}
            </ThemedText>
          </View>
          {headerExtra}
        </View>

        <View style={[styles.main, { backgroundColor: theme.background, paddingBottom: padding.paddingBottom }]}>
          <View style={styles.inner}>{children}</View>
        </View>
      </ScrollView>
    </View>
  );
}

/** Okrogel gumb v temni glavi (nazaj, obvestila …). */
export function HeroButton({
  label,
  onPress,
  dot = false,
  children,
}: {
  label: string;
  onPress: () => void;
  dot?: boolean;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.roundButton, { backgroundColor: theme.heroControl }, pressed && styles.pressed]}>
      {children}
      {dot && <View style={[styles.dot, { backgroundColor: theme.notifyDot }]} />}
    </Pressable>
  );
}

/** Zvonec z rdečo piko za neprebrana obvestila. */
export function NotificationsButton({ unread }: { unread: number }) {
  const theme = useTheme();
  return (
    <HeroButton
      label={unread > 0 ? `Obvestila, neprebrana: ${unread}` : 'Obvestila'}
      dot={unread > 0}
      onPress={() => router.push('/notifications')}>
      <Icon ios="bell" md="notifications" size={20} color={theme.heroText} />
    </HeroButton>
  );
}

/** Bela zaobljena ploščica svetlega dela. */
export function HeroTile({ children, style }: { children: ReactNode; style?: object }) {
  const theme = useTheme();
  return <View style={[heroStyles.tile, { backgroundColor: theme.backgroundElement }, style]}>{children}</View>;
}

/** Ploščica s številom (Kuponi, Prihajajoče): oznaka, veliko število in povezava. */
export function HeroCountTile({
  label,
  value,
  link,
  onPress,
  onLink,
}: {
  label: string;
  value: number | string;
  link: string;
  onPress: () => void;
  onLink?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [heroStyles.tile, styles.countTile, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
      <ThemedText themeColor="textSecondary" style={styles.countLabel}>
        {label}
      </ThemedText>
      <ThemedText style={styles.countValue}>{value}</ThemedText>
      <Pressable onPress={onLink ?? onPress} hitSlop={8} accessibilityRole="link">
        <ThemedText style={[styles.countLink, { color: theme.primary }]}>{link}</ThemedText>
      </Pressable>
    </Pressable>
  );
}

/** Velik rdeč gumb (»Rezerviraj novo uro«, »Poišči termin«). */
export function HeroPrimaryButton({
  title,
  icon,
  onPress,
  loading = false,
  disabled = false,
}: {
  title: string;
  icon?: IconName;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.bigButton,
        { backgroundColor: pressed ? theme.primaryPressed : theme.primary },
        inactive && styles.inactive,
      ]}>
      {loading ? (
        <ActivityIndicator color={theme.onPrimary} />
      ) : (
        <>
          {icon && <Icon ios={icon.ios} md={icon.md} size={20} color={theme.onPrimary} />}
          <ThemedText style={[styles.bigButtonText, { color: theme.onPrimary }]}>{title}</ThemedText>
        </>
      )}
    </Pressable>
  );
}

/** Sekundarni gumb na ploščici (»Odpovej«, »Izstopi iz čakalne vrste«); danger: rdeč napis. */
export function HeroSecondaryButton({
  title,
  icon,
  onPress,
  danger = false,
  loading = false,
  disabled = false,
}: {
  title: string;
  icon?: IconName;
  onPress: () => void;
  danger?: boolean;
  loading?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const inactive = disabled || loading;
  const color = danger ? theme.danger : theme.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.secondaryButton,
        { backgroundColor: theme.backgroundSelected },
        pressed && styles.pressed,
        inactive && styles.inactive,
      ]}>
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          {icon && <Icon ios={icon.ios} md={icon.md} size={18} color={color} />}
          <ThemedText style={[styles.secondaryText, { color }]}>{title}</ThemedText>
        </>
      )}
    </Pressable>
  );
}

/** Prazno stanje: ikona v rdečem krogu, naslov, razlaga in neobvezen gumb. */
export function HeroEmpty({
  icon,
  title,
  text,
  action,
}: {
  icon: IconName;
  title: string;
  text: string;
  action?: { title: string; onPress: () => void };
}) {
  const theme = useTheme();
  return (
    <HeroTile style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}>
        <Icon ios={icon.ios} md={icon.md} size={32} color={theme.primary} />
      </View>
      <ThemedText style={styles.emptyTitle}>{title}</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.emptyText}>
        {text}
      </ThemedText>
      {action && (
        <View style={styles.emptyAction}>
          <HeroPrimaryButton title={action.title} onPress={action.onPress} />
        </View>
      )}
    </HeroTile>
  );
}

/** Skupni slogi ploščic (rdeča oznaka razdelka, krepek naslov, sivo besedilo). */
export const heroStyles = StyleSheet.create({
  tile: { borderRadius: 20, padding: Spacing.three },
  label: { fontSize: 12, lineHeight: 16, fontWeight: 700, letterSpacing: 0.7, textTransform: 'uppercase' },
  tileTitle: { fontSize: 15, lineHeight: 20, fontWeight: 800 },
  meta: { fontSize: 12, lineHeight: 16, fontWeight: 600 },
  body: { fontSize: 13, lineHeight: 19 },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', gap: 12 },
  sectionLabel: { marginTop: Spacing.one, marginLeft: Spacing.one },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  pressed: { opacity: 0.85 },
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three + Spacing.one,
    paddingBottom: Spacing.four,
    gap: Spacing.three + Spacing.half,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoPlate: { width: 36, height: 36, borderRadius: 9, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  logo: { width: 26, height: 25 },
  brandText: { fontSize: 13, lineHeight: 16, fontWeight: 800, letterSpacing: 1.6 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  roundButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 9, right: 10, width: 9, height: 9, borderRadius: 5 },
  overline: { fontSize: 14, lineHeight: 20, fontWeight: 600 },
  title: { marginTop: 6, fontSize: 26, lineHeight: 32, fontWeight: 800 },
  titleCompact: { fontSize: 19, lineHeight: 24 },
  titleAlone: { marginTop: 0 },
  main: {
    flexGrow: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 22,
    paddingHorizontal: Spacing.three + Spacing.one,
  },
  inner: { width: '100%', maxWidth: MaxContentWidth - Spacing.five, alignSelf: 'center', gap: 14 },
  bigButton: { height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  bigButtonText: { fontSize: 16, lineHeight: 20, fontWeight: 700 },
  secondaryButton: { height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  secondaryText: { fontSize: 14, lineHeight: 18, fontWeight: 700 },
  inactive: { opacity: 0.45 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: Spacing.five, paddingHorizontal: Spacing.four, borderRadius: 24 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { marginTop: Spacing.one, fontSize: 18, lineHeight: 24, fontWeight: 800, textAlign: 'center' },
  emptyText: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  emptyAction: { alignSelf: 'stretch', marginTop: Spacing.two },
  countTile: { flex: 1, gap: 6 },
  countLabel: { fontSize: 12, lineHeight: 16, fontWeight: 700 },
  countValue: { fontSize: 34, lineHeight: 38, fontWeight: 800 },
  countLink: { fontSize: 13, lineHeight: 18, fontWeight: 700, paddingTop: 6 },
});
