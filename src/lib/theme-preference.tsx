import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, Platform } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';

// Nastavitev naprave, ne uporabnika: ostane po odjavi (clearCache briše samo ključe »cache:«)
const STORAGE_KEY = 'pref:theme';

type ThemePreferenceValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemePreferenceContext = createContext<ThemePreferenceValue>({
  preference: 'system',
  setPreference: () => {},
});

export function useThemePreference(): ThemePreferenceValue {
  return use(ThemePreferenceContext);
}

/** Na telefonu temo sporočimo tudi sistemu, da se ujemajo vrstica stanja, opozorila in zavihki. */
function applyToNative(preference: ThemePreference) {
  if (Platform.OS === 'web') return;
  Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
}

/** Izbira teme (samodejno / svetla / temna), shranjena na napravi. Do branja izbire ne izriše ničesar. */
export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
          applyToNative(stored);
        }
      })
      .catch(() => {
        // Shramba ni na voljo — ostane samodejna tema
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    applyToNative(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo(() => ({ preference, setPreference }), [preference, setPreference]);

  if (!ready) return null;
  return <ThemePreferenceContext value={value}>{children}</ThemePreferenceContext>;
}
