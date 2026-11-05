import { router, type Href } from 'expo-router';

/**
 * Nazaj v skladu (npr. »Upravljanje«); če je zaslon odprt neposredno (npr. povezava), na podani zaslon.
 * canDismiss upošteva samo sklad zavihka — router.back() bi sicer lahko skočil v drug zavihek.
 */
export function goBack(fallback: Href = '/manage') {
  if (router.canDismiss()) router.back();
  else router.replace(fallback);
}
