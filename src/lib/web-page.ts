import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { Platform } from 'react-native';

import { API_URL } from './config';

/** Odpre stran spletnega dela (npr. nakup kuponov) — na telefonu v brskalniku v aplikaciji. */
export async function openWebPage(path: string) {
  const url = `${API_URL}${path}`;
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener');
    return;
  }
  await openBrowserAsync(url, { presentationStyle: WebBrowserPresentationStyle.AUTOMATIC });
}
