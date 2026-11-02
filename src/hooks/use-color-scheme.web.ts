import { useSyncExternalStore } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useThemePreference } from '@/lib/theme-preference';

// Pri statičnem izrisu (strežnik) sistemska tema ni znana — prvi izris na odjemalcu je »svetla«,
// takoj zatem prava vrednost. useSyncExternalStore to naredi brez setState v efektu.
const subscribe = () => () => {};

/** Tema aplikacije: izbira uporabnika (svetla/temna) ali sistemska, če je izbrano »Samodejno«. */
export function useColorScheme(): 'light' | 'dark' {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const system = useSystemColorScheme();
  const { preference } = useThemePreference();
  if (preference !== 'system') return preference;
  return hydrated && system === 'dark' ? 'dark' : 'light';
}
