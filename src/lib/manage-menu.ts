import type { Href } from 'expo-router';

import type { User } from './types';

export type ManageItem = { href: Href; title: string; description: string };

/** Razdelki zavihka »Upravljanje« glede na pravice (strežnik jih ob vsakem klicu preveri znova). */
export function manageItems(user: User | null): ManageItem[] {
  const p = user?.permissions;
  if (!p) return [];
  return [
    p.appointments_view && {
      href: '/manage/appointments' as Href,
      title: 'Termini (urnik)',
      description: 'Dnevi, ure, veljavnost, kapaciteta, veriga, konji in učitelji',
    },
    p.appointments_view && {
      href: '/manage/appointment-types' as Href,
      title: 'Tipi terminov',
      description: 'Izbira konja, kupon, ki ga termin porabi, vrstni red',
    },
    p.coupons_view_all && {
      href: '/manage/coupons' as Href,
      title: 'Kuponi',
      description: 'Knjiga kuponov, ročni vnos nakupa ali porabe',
    },
    p.coupon_types_view && {
      href: '/manage/coupon-types' as Href,
      title: 'Tipi kuponov in paketi',
      description: 'Cene kuponov in paketov za nakup',
    },
    p.users_view && {
      href: '/manage/members' as Href,
      title: 'Člani',
      description: 'Stanje kuponov, dovoljeni tipi terminov',
    },
    p.settings_edit && {
      href: '/manage/settings' as Href,
      title: 'Nastavitve rezervacij',
      description: 'Roki za rezervacijo in odpoved, prejemniki obvestil',
    },
  ].filter((item): item is ManageItem => !!item);
}
