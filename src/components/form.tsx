import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';

/** Validacijske napake strežnika po poljih (Laravel 422). */
export type FieldErrors = Record<string, string>;

export function fieldErrors(e: unknown): FieldErrors {
  if (!(e instanceof ApiError) || !e.errors) return {};
  return Object.fromEntries(Object.entries(e.errors).map(([field, messages]) => [field, messages[0]]));
}

export function FormCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {title && <ThemedText type="smallBold">{title}</ThemedText>}
      {children}
    </ThemedView>
  );
}

export function FieldError({ text }: { text?: string }) {
  const theme = useTheme();
  if (!text) return null;
  return (
    <ThemedText type="small" style={{ color: theme.danger }}>
      {text}
    </ThemedText>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  error,
  multiline,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  error?: string;
  multiline?: boolean;
  hint?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCorrect={false}
        style={[
          styles.input,
          multiline && styles.multiline,
          { color: theme.text, backgroundColor: theme.background, borderColor: error ? theme.danger : 'transparent' },
        ]}
      />
      {hint && !error && (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      )}
      <FieldError text={error} />
    </View>
  );
}

export function ToggleRow({
  label,
  value,
  onValueChange,
  hint,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  hint?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={() => onValueChange(!value)} style={styles.toggle} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <View style={styles.flex}>
        <ThemedText type="small">{label}</ThemedText>
        {hint && (
          <ThemedText type="small" themeColor="textSecondary">
            {hint}
          </ThemedText>
        )}
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: theme.primary }} />
    </Pressable>
  );
}

/** Polje, ki odpre izbiro (PickerSheet) — prikaže trenutno izbrano vrednost. */
export function SelectField({
  label,
  valueLabel,
  onPress,
  error,
  disabled,
}: {
  label: string;
  valueLabel: string;
  onPress: () => void;
  error?: string;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${valueLabel}`}
        style={[styles.input, styles.select, { backgroundColor: theme.background, borderColor: error ? theme.danger : 'transparent', opacity: disabled ? 0.5 : 1 }]}>
        <ThemedText style={styles.flex} numberOfLines={2}>
          {valueLabel}
        </ThemedText>
        <ThemedText themeColor="textSecondary">▾</ThemedText>
      </Pressable>
      <FieldError text={error} />
    </View>
  );
}

const DAY_LABELS: [string, string][] = [
  ['day_monday', 'Pon'],
  ['day_tuesday', 'Tor'],
  ['day_wednesday', 'Sre'],
  ['day_thursday', 'Čet'],
  ['day_friday', 'Pet'],
  ['day_saturday', 'Sob'],
  ['day_sunday', 'Ned'],
];

/** Izbira dni v tednu (gumbi, ki se dotaknejo enostavno tudi na telefonu). */
export function DaysField<T extends Record<string, unknown>>({
  value,
  onToggle,
  error,
}: {
  value: T;
  onToggle: (day: string) => void;
  error?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        Dnevi v tednu
      </ThemedText>
      <View style={styles.days}>
        {DAY_LABELS.map(([key, label]) => {
          const on = !!value[key];
          return (
            <Pressable
              key={key}
              onPress={() => onToggle(key)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={[styles.day, { backgroundColor: on ? theme.primary : theme.background }]}>
              <ThemedText type="smallBold" style={on && { color: '#fff' }}>
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      <FieldError text={error} />
    </View>
  );
}

export function dayNames(value: Record<string, unknown>): string {
  return DAY_LABELS.filter(([key]) => value[key]).map(([, label]) => label.toLowerCase()).join(', ');
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.three },
  field: { gap: Spacing.one },
  input: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    minHeight: 44,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  select: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 44 },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  day: { minWidth: 48, paddingVertical: Spacing.two, borderRadius: Spacing.two, alignItems: 'center' },
});
