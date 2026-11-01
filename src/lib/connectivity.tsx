import { useNetworkState } from 'expo-network';
import { createContext, use, useEffect, useMemo, useState, type ReactNode } from 'react';

import { ping, setReachabilityHandler } from './api';

type Connectivity = {
  /** Naprava ima internet in strežnik se odziva — samo takrat je oddaja rezervacij mogoča. */
  isOnline: boolean;
  /** Ročno preveri strežnik (npr. "potegni za osvežitev" brez povezave). */
  recheck: () => Promise<boolean>;
};

const ConnectivityContext = createContext<Connectivity | null>(null);

export function useConnectivity(): Connectivity {
  const value = use(ConnectivityContext);
  if (!value) throw new Error('useConnectivity mora biti znotraj <ConnectivityProvider>');
  return value;
}

const RETRY_MS = 15000;

export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const network = useNetworkState();
  // Dokler stanje omrežja ni znano (undefined), predpostavimo povezavo — odloči prvi klic API-ja
  const deviceOnline = network.isConnected !== false && network.isInternetReachable !== false;
  const [apiReachable, setApiReachable] = useState(true);

  useEffect(() => {
    setReachabilityHandler(setApiReachable);
    return () => setReachabilityHandler(null);
  }, []);

  // Naprava ima omrežje, strežnik pa se ni odzval: preverjaj, dokler se ne vrne
  useEffect(() => {
    if (!deviceOnline || apiReachable) return;
    ping();
    const id = setInterval(ping, RETRY_MS);
    return () => clearInterval(id);
  }, [deviceOnline, apiReachable]);

  const value = useMemo(
    () => ({ isOnline: deviceOnline && apiReachable, recheck: ping }),
    [deviceOnline, apiReachable],
  );

  return <ConnectivityContext value={value}>{children}</ConnectivityContext>;
}
