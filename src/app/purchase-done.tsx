import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';

import { HeroEmpty, HeroScreen } from '@/components/hero-screen';
import { emitDataChanged } from '@/lib/data-version';

// Na spletu se ta stran odpre v pojavnem oknu plačila: sporoči rezultat zaslonu »Nakup kuponov« in se zapre.
// Na telefonu se brskalnik zapre sam; sem pride uporabnik le, če je aplikacijo medtem zaprl.
WebBrowser.maybeCompleteAuthSession();

/** Vrnitev s spletne strani za plačilo (rezervacije://purchase-done?status=success). */
export default function PurchaseDoneScreen() {
  const { status } = useLocalSearchParams<{ status?: string }>();
  const paid = status === 'success';

  useEffect(() => {
    emitDataChanged();
  }, []);

  return (
    <HeroScreen overline="Nakup kuponov" title={paid ? 'Plačilo je uspelo' : 'Nakup ni zaključen'} back="/coupons">
      <HeroEmpty
        icon={paid ? { ios: 'checkmark.circle.fill', md: 'check_circle' } : { ios: 'clock', md: 'schedule' }}
        title={paid ? 'Kuponi so dodani' : 'Plačilo ni bilo potrjeno'}
        text={
          paid
            ? 'Kuponi so dodani na tvoj račun in jih že lahko uporabiš za rezervacijo.'
            : 'Če je bilo plačilo izvedeno, se kuponi prikažejo pod Kuponi v nekaj trenutkih.'
        }
        action={{ title: 'Na moje kupone', onPress: () => router.replace('/coupons') }}
      />
    </HeroScreen>
  );
}
