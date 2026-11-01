import { Platform } from 'react-native';

// Osnovni URL Laravel instance (npr. https://kk-karlo.epro.one).
// Nastavi se v .env kot EXPO_PUBLIC_API_URL — glej .env.example.
// Na spletu lahko z EXPO_PUBLIC_API_URL_WEB uporabiš drug URL (npr. lokalni Herd),
// ker brskalnik na tem računalniku vidi tudi *.test in localhost.
const rawApiUrl =
  (Platform.OS === 'web' && process.env.EXPO_PUBLIC_API_URL_WEB) ||
  process.env.EXPO_PUBLIC_API_URL;

if (!rawApiUrl) {
  console.warn('EXPO_PUBLIC_API_URL ni nastavljen — dodaj ga v .env');
}

export const API_URL = (rawApiUrl ?? '').replace(/\/+$/, '');
