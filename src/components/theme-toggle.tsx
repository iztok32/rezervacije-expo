import { Pressable, StyleSheet, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemePreference } from '@/lib/theme-preference';

// Barve kot stikalo teme na spletu (ThemeToggle.tsx: slate-200 / slate-700, sonce orange-500, luna blue-400)
const TRACK_LIGHT = '#E2E8F0';
const TRACK_DARK = '#334155';
const SUN = '#F97316';
const MOON = '#60A5FA';
const THUMB = '#FFFFFF';
// Na temni glavi (»Domov«) prosojna podlaga kot ostali gumbi v glavi
const TRACK_ON_DARK = 'rgba(255,255,255,0.14)';

/**
 * Stikalo svetla/temna tema, enako kot na spletnem delu: drsnik s soncem (svetla) ali luno (temna).
 * Izbira se shrani na napravi; dokler je uporabnik ne spremeni, velja sistemska tema.
 * onDark: na temni podlagi (glava zavihka »Domov«), večje za dotik.
 */
export function ThemeToggle({ onDark = false }: { onDark?: boolean }) {
  const scheme = useColorScheme();
  const { setPreference } = useThemePreference();
  const dark = scheme === 'dark';

  return (
    <Pressable
      onPress={() => setPreference(dark ? 'light' : 'dark')}
      hitSlop={10}
      accessibilityRole="switch"
      accessibilityLabel="Temna tema"
      accessibilityState={{ checked: dark }}
      aria-checked={dark}
      style={({ pressed }) => [
        styles.track,
        onDark && styles.trackLarge,
        { backgroundColor: onDark ? TRACK_ON_DARK : dark ? TRACK_DARK : TRACK_LIGHT },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.thumb, onDark && styles.thumbLarge, dark ? styles.thumbRight : styles.thumbLeft]}>{dark ? <MoonIcon /> : <SunIcon />}</View>
    </Pressable>
  );
}

function SunIcon() {
  return (
    <View style={styles.icon}>
      {[0, 45, 90, 135].map((deg) => (
        <View key={deg} style={[styles.ray, { transform: [{ rotate: `${deg}deg` }] }]} />
      ))}
      <View style={styles.sunCore} />
    </View>
  );
}

function MoonIcon() {
  return (
    <View style={styles.icon}>
      <View style={styles.moon} />
      {/* Polmesec: krog v barvi drsnika prekrije del lune */}
      <View style={styles.moonCut} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 52,
    height: 30,
    borderRadius: 15,
    padding: 3,
    justifyContent: 'center',
  },
  trackLarge: { width: 64, height: 36, borderRadius: 18 },
  pressed: { opacity: 0.8 },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THUMB,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 1px 3px rgba(0,0,0,0.25)',
  },
  thumbLarge: { width: 30, height: 30, borderRadius: 15 },
  thumbLeft: { alignSelf: 'flex-start' },
  thumbRight: { alignSelf: 'flex-end' },
  icon: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  ray: { position: 'absolute', width: 2, height: 14, borderRadius: 1, backgroundColor: SUN },
  sunCore: { width: 8, height: 8, borderRadius: 4, backgroundColor: SUN, borderWidth: 1.5, borderColor: THUMB },
  moon: { width: 12, height: 12, borderRadius: 6, backgroundColor: MOON },
  moonCut: { position: 'absolute', top: 0, right: 0, width: 9, height: 9, borderRadius: 4.5, backgroundColor: THUMB },
});
