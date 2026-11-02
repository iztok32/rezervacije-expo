import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemePreference, type ThemePreference } from '@/lib/theme-preference';

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Samodejno' },
  { value: 'light', label: 'Svetla' },
  { value: 'dark', label: 'Temna' },
];

/** Izbira teme aplikacije (shrani se na napravi in velja tudi ob naslednji prijavi). */
export function ThemeSwitch() {
  const theme = useTheme();
  const { preference, setPreference } = useThemePreference();

  return (
    <View style={styles.wrap}>
      <ThemedText type="small" themeColor="textSecondary">
        Videz aplikacije
      </ThemedText>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Videz aplikacije"
        style={[styles.group, { backgroundColor: theme.backgroundSelected }]}>
        {OPTIONS.map((o) => {
          const selected = preference === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => setPreference(o.value)}
              accessibilityRole="radio"
              accessibilityLabel={o.label}
              accessibilityState={{ checked: selected }}
              style={[styles.option, selected && { backgroundColor: theme.backgroundElement, boxShadow: '0px 1px 3px rgba(0,0,0,0.12)' }]}>
              <ThemedText type="smallBold" style={{ color: selected ? theme.primary : theme.textSecondary }}>
                {o.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one, width: '100%', maxWidth: 440, alignSelf: 'center' },
  group: { flexDirection: 'row', borderRadius: Radius.medium, padding: Spacing.half + 1, gap: Spacing.half },
  option: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.two, borderRadius: Radius.small + 2, minHeight: 40 },
});
