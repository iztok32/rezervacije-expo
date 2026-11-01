import { useSyncExternalStore } from 'react';

// Po oddaji ali odpovedi rezervacije se osvežita oba zaslona (moje rezervacije in termini).
let version = 0;
const listeners = new Set<() => void>();

export function emitDataChanged() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDataVersion(): number {
  return useSyncExternalStore(subscribe, () => version, () => version);
}
