import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/montserrat';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ConnectivityProvider } from '@/lib/connectivity';
import { SessionProvider, useSession } from '@/lib/session';
import { ThemePreferenceProvider } from '@/lib/theme-preference';

SplashScreen.preventAutoHideAsync();

// Barve navigacije (ozadje zaslonov, poudarki) iz grafične podobe kluba
function navigationTheme(dark: boolean): Theme {
  const base = dark ? DarkTheme : DefaultTheme;
  const c = Colors[dark ? 'dark' : 'light'];
  return {
    ...base,
    colors: { ...base.colors, primary: c.primary, background: c.background, card: c.backgroundElement, text: c.text, border: c.border },
  };
}

export default function RootLayout() {
  // Izbira teme se prebere pred prvim izrisom, da ne preskoči iz svetle v temno
  return (
    <ThemePreferenceProvider>
      <AppRoot />
    </ThemePreferenceProvider>
  );
}

function AppRoot() {
  const colorScheme = useColorScheme();
  // Zagonski zaslon ostane, dokler se ne naloži pisava (sicer bi besedilo preskočilo na drugo pisavo)
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
  });

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={navigationTheme(colorScheme === 'dark')}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ConnectivityProvider>
        <SessionProvider>
          <AnimatedSplashOverlay />
          <RootNavigator />
        </SessionProvider>
      </ConnectivityProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { user, isLoading } = useSession();
  const colorScheme = useColorScheme();
  const c = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="reservations" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="purchase" />
        <Stack.Screen name="purchase-done" />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
