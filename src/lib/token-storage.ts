import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Sanctum API žeton. Na napravi je shranjen v Keychain / Keystore,
// na spletu (samo za razvoj) v localStorage, ker SecureStore tam ne deluje.
const TOKEN_KEY = 'auth_token';

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') return localStorage.getItem(TOKEN_KEY);
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === 'web') return localStorage.setItem(TOKEN_KEY, token);
  return SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') return localStorage.removeItem(TOKEN_KEY);
  return SecureStore.deleteItemAsync(TOKEN_KEY);
}
