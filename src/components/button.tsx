import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'secondary' | 'danger';

/** Gumb v slogu kkkarlo.si: velike črke, krepka pisava; glavni je rdeč, sekundarni obrobljen. */
export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const inactive = disabled || loading;

  const filled = variant !== 'secondary';
  const color = filled ? theme.onPrimary : variant === 'secondary' ? theme.text : theme.onPrimary;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && { backgroundColor: pressed ? theme.primaryPressed : theme.primary },
        variant === 'danger' && { backgroundColor: theme.danger, opacity: pressed ? 0.85 : 1 },
        variant === 'secondary' && {
          backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
          borderWidth: 1.5,
          borderColor: theme.border,
        },
        inactive && styles.inactive,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? theme.primary : color} />
      ) : (
        <ThemedText type="smallBold" style={[styles.label, { color }]}>
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Radius.medium,
    paddingVertical: Spacing.three - Spacing.half,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  label: { textTransform: 'uppercase', letterSpacing: 0.8 },
  inactive: { opacity: 0.45 },
});
