import type { Href } from 'expo-router';

import type { User } from './types';

export type ManageItem = { href: Href; title: string; description: string };

/**
 * Razdelki zavihka »Upravljanje« glede na pravice (strežnik jih ob vsakem klicu preveri znova).
 * Tipi terminov, tipi kuponov in paketi ter nastavitve rezervacij se urejajo samo na spletu.
 */
export function manageItems(user: User | null): ManageItem[] {
  const p = user?.permissions;
  if (!p) return [];
  return [
    p.appointments_view && {
      href: '/manage/appointments' as Href,
      title: 'Termini (urnik)',
      description: 'Dnevi, ure, veljavnost, kapaciteta, veriga, konji in učitelji',
    },
    p.coupons_view_all && {
      href: '/manage/coupons' as Href,
      title: 'Kuponi',
      description: 'Knjiga kuponov, ročni vnos nakupa ali porabe',
    },
    p.users_view && {
      href: '/manage/members' as Href,
      title: 'Člani',
      description: 'Stanje kuponov, dovoljeni tipi terminov',
    },
  ].filter((item): item is ManageItem => !!item);
}
