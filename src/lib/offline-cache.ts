import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Reservation, User } from './types';

// Lokalna kopija za način brez povezave: zadnji znani uporabnik in njegove oddane rezervacije.
// Žeton je posebej v SecureStore (token-storage.ts). Napake shrambe ne smejo ustaviti aplikacije.

const USER_KEY = 'cache:user';
const reservationsKey = (userId: number) => `cache:reservations:${userId}`;

export type Cached<T> = { data: T; savedAt: string };

async function read<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function write(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Shramba ni na voljo — aplikacija deluje naprej, le brez lokalne kopije
  }
}

export function loadCachedUser(): Promise<User | null> {
  return read<User>(USER_KEY);
}

export function saveCachedUser(user: User): Promise<void> {
  return write(USER_KEY, user);
}

export function loadCachedReservations(userId: number): Promise<Cached<Reservation[]> | null> {
  return read<Cached<Reservation[]>>(reservationsKey(userId));
}

export function saveCachedReservations(userId: number, reservations: Reservation[]): Promise<void> {
  return write(reservationsKey(userId), { data: reservations, savedAt: new Date().toISOString() });
}

export async function clearCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith('cache:')));
  } catch {
    // ignoriraj
  }
}
