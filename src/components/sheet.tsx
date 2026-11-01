import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

/** Celozaslonsko podokno z naslovom in »Zapri« (obrazci v upravljanju). */
export function Sheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={onClose}>
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <View style={styles.flex}>
              <ThemedText type="smallBold" style={styles.title}>
                {title}
              </ThemedText>
              {subtitle && (
                <ThemedText type="small" themeColor="textSecondary">
                  {subtitle}
                </ThemedText>
              )}
            </View>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
              <ThemedText type="linkPrimary">Zapri</ThemedText>
            </Pressable>
          </View>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

/**
 * Nazaj v skladu »Upravljanje«; če je zaslon odprt neposredno (npr. povezava), na podani zaslon.
 * canDismiss upošteva samo sklad zavihka — router.back() bi sicer lahko skočil v drug zavihek.
 */
export function goBack(fallback: Href = '/manage') {
  if (router.canDismiss()) router.back();
  else router.replace(fallback);
}

/** Glava podzaslona v upravljanju: »‹ Nazaj«, naslov in neobvezna akcija desno. */
export function SubHeader({ title, right, back = '/manage' }: { title: string; right?: ReactNode; back?: Href }) {
  return (
    <View style={styles.subHeader}>
      <Pressable onPress={() => goBack(back)} hitSlop={12} accessibilityRole="button">
        <ThemedText type="linkPrimary">‹ Nazaj</ThemedText>
      </Pressable>
      <View style={styles.subTitleRow}>
        <ThemedText type="subtitle" style={styles.subTitle}>
          {title}
        </ThemedText>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  title: { fontSize: 18 },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  subHeader: { gap: Spacing.one, marginBottom: Spacing.two },
  subTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  subTitle: { flex: 1, fontSize: 26, lineHeight: 32 },
});
