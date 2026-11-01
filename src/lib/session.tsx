import * as Device from 'expo-device';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { api, ApiError, setUnauthorizedHandler } from './api';
import { useConnectivity } from './connectivity';
import { clearCache, loadCachedUser, saveCachedUser } from './offline-cache';
import { clearToken, getToken, setToken } from './token-storage';
import type { LoginResponse, User } from './types';

type Session = {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const session = use(SessionContext);
  if (!session) throw new Error('useSession mora biti znotraj <SessionProvider>');
  return session;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const { isOnline } = useConnectivity();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Uporabnik iz lokalne kopije (zagon brez povezave) — ob povezavi ga osvežimo s strežnika
  const [isStale, setIsStale] = useState(false);

  // Ob zagonu: če je žeton shranjen, preveri, ali še velja. Brez povezave uporabi lokalno kopijo,
  // da uporabnik ostane prijavljen in vidi svoje rezervacije.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!(await getToken())) return;
        try {
          const me = await api.get<User>('/user');
          if (cancelled) return;
          setUser(me);
          saveCachedUser(me);
        } catch (e) {
          if (e instanceof ApiError && e.status === 401) {
            await clearToken();
            await clearCache();
            return;
          }
          const cached = await loadCachedUser();
          if (!cancelled && cached) {
            setUser(cached);
            setIsStale(true);
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isOnline || !isStale) return;
    api.get<User>('/user').then(
      (me) => {
        setUser(me);
        setIsStale(false);
        saveCachedUser(me);
      },
      () => {
        // 401 obdela setUnauthorizedHandler, omrežno napako naslednji poskus
      },
    );
  }, [isOnline, isStale]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken();
      clearCache();
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api.post<LoginResponse>('/login', {
      email: email.trim(),
      password,
      device_name: Device.deviceName ?? `rezervacije-${Platform.OS}`,
    });
    await setToken(res.token);
    await saveCachedUser(res.user);
    setIsStale(false);
    setUser(res.user);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.post('/logout');
    } catch {
      // Brez povezave ali žeton je že neveljaven — lokalno odjavo naredimo vseeno.
    }
    await clearToken();
    await clearCache();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, signIn, signOut }),
    [user, isLoading, signIn, signOut],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}
