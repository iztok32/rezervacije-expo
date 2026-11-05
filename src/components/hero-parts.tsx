import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { heroStyles, type IconName } from '@/components/hero-screen';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Manjši gradniki v slogu »Domov« (temna glava, ploščice), skupni upravljanju in podoknom.

/** Iskalno polje v temni glavi. */
export function HeroSearch({
  value,
  onChangeText,
  placeholder,
  autoFocus,
}: {
  value?: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.search, { backgroundColor: theme.heroControl }]}>
      <Icon ios="magnifyingglass" md="search" size={18} color={theme.heroMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.heroMuted}
        accessibilityLabel={placeholder}
        autoCorrect={false}
        autoFocus={autoFocus}
        style={[styles.searchInput, { color: theme.heroText }]}
      />
    </View>
  );
}

/** Preklop med možnostmi v temni glavi (npr. Veljavni / Vsi). */
export function HeroSegmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const theme = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.segmented, { backgroundColor: theme.heroControl }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            aria-checked={on}
            style={[styles.segment, on && { backgroundColor: '#FFFFFF' }]}>
            <ThemedText style={[styles.segmentText, { color: on ? '#1F1D1B' : theme.heroText }]}>{o.label}</ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Oznaka razdelka na vrhu ploščice z ikono (rdeča ali siva). */
export function HeroTileHeader({ icon, label, tone = 'primary' }: { icon: IconName; label: string; tone?: 'primary' | 'textSecondary' }) {
  const theme = useTheme();
  const color = theme[tone];
  return (
    <View style={styles.tileHeader}>
      <Icon ios={icon.ios} md={icon.md} size={18} color={color} />
      <ThemedText style={[heroStyles.label, styles.flex, { color }]}>{label}</ThemedText>
    </View>
  );
}

/** Rdeča oznaka razdelka nad ploščicami. */
export function HeroSectionLabel({ children }: { children: string }) {
  const theme = useTheme();
  return <ThemedText style={[heroStyles.label, heroStyles.sectionLabel, { color: theme.primary }]}>{children}</ThemedText>;
}

export function initials(name: string | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

/** Začetnice v zaobljenem kvadratu (člani, udeleženci). */
export function HeroAvatar({ name, highlight = false, size = 36 }: { name: string; highlight?: boolean; size?: number }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 3, backgroundColor: highlight ? theme.primary : theme.backgroundSelected },
      ]}>
      <ThemedText style={[styles.avatarText, { color: highlight ? theme.onPrimary : theme.textSecondary }]}>{initials(name)}</ThemedText>
    </View>
  );
}

/** Ikona v zaobljenem kvadratu (vrstice seznama). */
export function HeroIconBox({ icon, highlight = false, tone }: { icon: IconName; highlight?: boolean; tone?: 'success' | 'danger' }) {
  const theme = useTheme();
  const bg = tone === 'success' ? theme.successSoft : tone === 'danger' ? theme.primarySoft : highlight ? theme.primary : theme.backgroundSelected;
  const fg = tone === 'success' ? theme.success : tone === 'danger' ? theme.danger : highlight ? theme.onPrimary : theme.textSecondary;
  return (
    <View style={[styles.iconBox, { backgroundColor: bg }]}>
      <Icon ios={icon.ios} md={icon.md} size={20} color={fg} />
    </View>
  );
}

/** Tanka črta med vrsticami v ploščici (zamaknjena za ikono). */
export function HeroSeparator({ inset = 64 }: { inset?: number }) {
  const theme = useTheme();
  return <View style={[styles.separator, { marginLeft: inset, backgroundColor: theme.border }]} />;
}

/** Majhen gumb na ploščici (»Odjavi«, »Odstrani«, »Izbriši«). */
export function HeroChipButton({
  label,
  onPress,
  tone = 'default',
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  tone?: 'default' | 'danger' | 'warning';
  disabled?: boolean;
  icon?: IconName;
}) {
  const theme = useTheme();
  const color = tone === 'danger' ? theme.danger : tone === 'warning' ? theme.warning : theme.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: tone === 'warning' ? theme.warningBackground : theme.backgroundSelected },
        disabled && styles.disabled,
        pressed && heroStyles.pressed,
      ]}>
      {icon && <Icon ios={icon.ios} md={icon.md} size={16} color={color} />}
      <ThemedText style={[styles.chipText, { color }]} numberOfLines={1}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  search: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, height: 48, borderRadius: 16, paddingHorizontal: 14 },
  searchInput: { flex: 1, height: 48, fontSize: 15, fontFamily: FontFamily.medium },
  segmented: { flexDirection: 'row', gap: 4, borderRadius: 16, padding: 4 },
  segment: { flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 13, lineHeight: 18, fontWeight: 700 },
  tileHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, lineHeight: 16, fontWeight: 800 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  separator: { height: 1, marginRight: Spacing.three },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 12, borderRadius: 12 },
  chipText: { fontSize: 13, lineHeight: 18, fontWeight: 700 },
  disabled: { opacity: 0.45 },
});
