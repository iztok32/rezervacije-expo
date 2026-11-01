import { useCallback, useEffect, useState } from 'react';

import { api, errorMessage } from '@/lib/api';
import { useDataVersion } from '@/lib/data-version';

type State<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
};

// GET zahtevek, ki se ponovi ob spremembi poti ali po oddaji/odpovedi (emitDataChanged).
// path = null: zahteva se ne izvede (npr. brez povezave). refresh() za "potegni za osvežitev".
export function useApi<T>(path: string | null) {
  const version = useDataVersion();
  const [state, setState] = useState<State<T>>({
    data: null,
    error: null,
    loading: path !== null,
    refreshing: false,
  });
  const [loadedPath, setLoadedPath] = useState(path);
  const [reloadKey, setReloadKey] = useState(0);

  // Nova pot → prikaži nalaganje (vzorec "adjust state during render" namesto setState v efektu).
  if (loadedPath !== path) {
    setLoadedPath(path);
    setState((s) => ({ ...s, loading: path !== null, error: null }));
  }

  useEffect(() => {
    if (path === null) return;
    // Odgovor zastarele poti (npr. hitro preklapljanje datumov) zavržemo.
    let cancelled = false;
    api.get<T>(path).then(
      (data) => {
        if (!cancelled) setState({ data, error: null, loading: false, refreshing: false });
      },
      (e) => {
        if (cancelled) return;
        setState((s) => ({ ...s, error: errorMessage(e, 'Napaka pri nalaganju.'), loading: false, refreshing: false }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [path, reloadKey, version]);

  const refresh = useCallback(() => {
    setState((s) => ({ ...s, refreshing: true }));
    setReloadKey((k) => k + 1);
  }, []);

  return { ...state, refresh };
}
