import { useCallback, useEffect, useState } from 'react';

import { api, isNetworkError } from '@/lib/api';
import { useConnectivity } from '@/lib/connectivity';
import { useDataVersion } from '@/lib/data-version';
import { loadCachedHome, saveCachedHome } from '@/lib/offline-cache';
import { useSession } from '@/lib/session';
import type { HomeSummary } from '@/lib/types';

/**
 * Povzetek za »Domov« (kuponi, novica, neprebrana obvestila). Shrani se lokalno,
 * da so kuponi in novica vidni tudi brez povezave.
 */
export function useHome() {
  const { user } = useSession();
  const { isOnline } = useConnectivity();
  const version = useDataVersion();
  const userId = user?.id ?? null;
  const [home, setHome] = useState<HomeSummary | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (userId === null) return;
    let cancelled = false;
    loadCachedHome(userId).then((cached) => {
      if (!cancelled && cached) setHome((h) => h ?? cached.data);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (userId === null || !isOnline) return;
    let cancelled = false;
    api.get<HomeSummary>('/home').then(
      (data) => {
        if (cancelled) return;
        saveCachedHome(userId, data);
        setHome(data);
      },
      (e) => {
        // Povzetek ni nujen — ob napaki ostane zadnja znana kopija
        if (!isNetworkError(e)) console.warn('Povzetka ni bilo mogoče naložiti', e);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId, isOnline, version, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return { home, reload };
}
