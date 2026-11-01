import { useCallback, useEffect, useState } from 'react';

import { api, errorMessage, isNetworkError } from '@/lib/api';
import { useConnectivity } from '@/lib/connectivity';
import { useDataVersion } from '@/lib/data-version';
import { loadCachedReservations, saveCachedReservations } from '@/lib/offline-cache';
import { useSession } from '@/lib/session';
import type { Reservation } from '@/lib/types';

type State = {
  items: Reservation[] | null;
  // Kdaj je bil seznam nazadnje prenesen s strežnika (ISO) — prikaz pri lokalni kopiji
  savedAt: string | null;
  fromCache: boolean;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
};

/**
 * Moje oddane rezervacije. S povezavo jih prenese s strežnika in shrani lokalno,
 * brez povezave pokaže zadnjo shranjeno kopijo.
 */
export function useMyReservations() {
  const { user } = useSession();
  const { isOnline, recheck } = useConnectivity();
  const version = useDataVersion();
  const userId = user?.id ?? null;
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<State>({
    items: null,
    savedAt: null,
    fromCache: false,
    error: null,
    loading: true,
    refreshing: false,
  });

  // Lokalna kopija takoj ob odprtju — strežnik jo nadomesti, ko odgovori
  useEffect(() => {
    if (userId === null) return;
    let cancelled = false;
    loadCachedReservations(userId).then((cached) => {
      if (cancelled) return;
      setState((s) =>
        s.items !== null
          ? s
          : {
              ...s,
              items: cached?.data ?? null,
              savedAt: cached?.savedAt ?? null,
              fromCache: cached !== null,
              loading: isOnline && cached === null ? s.loading : false,
            },
      );
    });
    return () => {
      cancelled = true;
    };
    // Samo ob prijavi drugega uporabnika; povezava se obravnava spodaj
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (userId === null || !isOnline) return;
    let cancelled = false;
    api.get<{ data: Reservation[] }>('/reservations').then(
      (res) => {
        if (cancelled) return;
        saveCachedReservations(userId, res.data);
        setState({
          items: res.data,
          savedAt: new Date().toISOString(),
          fromCache: false,
          error: null,
          loading: false,
          refreshing: false,
        });
      },
      (e) => {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          fromCache: s.items !== null,
          // Omrežno napako pokaže obvestilo o povezavi, ne napaka seznama
          error: isNetworkError(e) ? null : errorMessage(e, 'Napaka pri nalaganju.'),
          loading: false,
          refreshing: false,
        }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId, isOnline, version, reloadKey]);

  const refresh = useCallback(() => {
    if (isOnline) {
      setState((s) => ({ ...s, refreshing: true }));
      setReloadKey((k) => k + 1);
    } else {
      // Brez povezave: preveri strežnik — ko se vrne, se seznam naloži sam
      recheck();
    }
  }, [isOnline, recheck]);

  return { ...state, loading: state.loading && state.items === null, refresh };
}
