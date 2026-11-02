import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Notice } from '@/components/notice';
import { ThemeSwitch } from '@/components/theme-switch';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CardShadow, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';

/** Prijava v slogu kkkarlo.si: fotografija jahališča, logotip kluba in rdeč gumb. */
export default function LoginScreen() {
  const { signIn } = useSession();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim() !== '' && password !== '' && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(errorMessage(e, 'Prijava ni uspela.'));
      setSubmitting(false);
    }
  }

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.background, borderColor: theme.border },
  ];

  return (
    <ThemedView style={styles.container}>
      {/* Svetle ikone vrstice stanja na temni fotografiji */}
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={styles.hero}>
            <Image
              source={require('@/assets/images/brand/hero.jpg')}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              accessibilityIgnoresInvertColors
            />
            {/* Zatemnitev fotografije (celotna + močnejša spodaj), da je bel napis berljiv */}
            <View style={styles.heroShade} />
            <View style={styles.heroShadeBottom} />
            <View style={[styles.heroText, { paddingTop: insets.top + Spacing.four }]}>
              <ThemedText type="overline" style={styles.heroOverline}>
                Konjeniški klub Karlo
              </ThemedText>
              <ThemedText type="title" style={styles.heroTitle}>
                Rezervacije
              </ThemedText>
              <ThemedText style={styles.heroLead}>Šola jahanja, treningi in tekmovanja nad Mariborom.</ThemedText>
            </View>
          </View>

          <ThemedView type="backgroundElement" style={[styles.card, { paddingBottom: insets.bottom + Spacing.four }]}>
            {/* Logotip je narejen za belo podlago (temen napis, prosojen trak) — tudi v temnem načinu */}
            <View style={styles.logoPlate}>
              <Image
                source={require('@/assets/images/brand/logo-full.png')}
                style={styles.logo}
                contentFit="contain"
                accessibilityLabel="Konjeniški klub Karlo, since 1996"
              />
            </View>

            <View style={styles.form}>
              <ThemedText type="smallBold">Prijava</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Prijavi se z e-pošto in geslom svojega računa kluba.
              </ThemedText>

              <TextInput
                style={inputStyle}
                placeholder="E-pošta"
                accessibilityLabel="E-pošta"
                placeholderTextColor={theme.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
              />
              <TextInput
                style={inputStyle}
                placeholder="Geslo"
                accessibilityLabel="Geslo"
                placeholderTextColor={theme.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
              />

              {error && <Notice tone="danger" text={error} />}

              <Button title="Prijava" onPress={handleSubmit} loading={submitting} disabled={!canSubmit} />
            </View>

            <ThemeSwitch />

            <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
              Kmetija Kovačič · Meljski hrib, Maribor
            </ThemedText>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1 },
  hero: { minHeight: 300, justifyContent: 'flex-end', overflow: 'hidden' },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.28)' },
  heroShadeBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '65%', backgroundColor: 'rgba(0,0,0,0.32)' },
  heroText: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.one,
  },
  heroOverline: { color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 1 }, opacity: 0.9 },
  heroTitle: { color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 1 } },
  heroLead: { color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 1 }, opacity: 0.9 },
  card: {
    flex: 1,
    marginTop: -Spacing.five,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
    boxShadow: CardShadow,
  },
  logoPlate: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.large,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  logo: { width: '100%', height: 110 },
  form: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: Spacing.three - Spacing.one },
  input: {
    borderRadius: Radius.medium,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - Spacing.one,
    fontSize: 16,
    fontFamily: FontFamily.medium,
  },
  footer: { textAlign: 'center' },
});
