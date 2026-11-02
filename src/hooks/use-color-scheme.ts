import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useThemePreference } from '@/lib/theme-preference';

/** Tema aplikacije: izbira uporabnika (svetla/temna) ali sistemska, če je izbrano »Samodejno«. */
export function useColorScheme(): 'light' | 'dark' {
  const system = useSystemColorScheme();
  const { preference } = useThemePreference();
  if (preference !== 'system') return preference;
  return system === 'dark' ? 'dark' : 'light';
}
