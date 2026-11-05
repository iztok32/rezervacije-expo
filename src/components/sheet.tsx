import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet } from 'react-native';

import { HeroScreen } from '@/components/hero-screen';

export { goBack } from '@/lib/navigation';

/**
 * Celozaslonsko podokno z obrazcem (upravljanje) v slogu »Domov«: temna glava z gumbom »Zapri«,
 * nadnaslov (subtitle) in naslov, spodaj ploščice.
 */
export function Sheet({
  title,
  subtitle,
  headerExtra,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  headerExtra?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <HeroScreen overline={subtitle} title={title} onClose={onClose} headerExtra={headerExtra}>
          {children}
        </HeroScreen>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
