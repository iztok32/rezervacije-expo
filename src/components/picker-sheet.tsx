import { useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { HeroSearch, HeroSeparator } from '@/components/hero-parts';
import { HeroPrimaryButton, HeroScreen, HeroTile, heroStyles } from '@/components/hero-screen';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PickerItem<T extends string | number | null> = {
  value: T;
  label: string;
  note?: string;
};

function Shell({ title, overline, onClose, search, children }: { title: string; overline?: string; onClose: () => void; search: React.ReactNode; children: React.ReactNode }) {
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={onClose}>
      <HeroScreen overline={overline} title={title} onClose={onClose} compact headerExtra={search}>
        {children}
      </HeroScreen>
    </Modal>
  );
}

/**
 * Izbira s seznama v celozaslonskem podoknu (na telefonu bolj pregledno kot spustni meni).
 * Brez onSearch išče lokalno po oznakah; z onSearch iskanje opravi klicatelj (npr. strežnik).
 */
export function PickerSheet<T extends string | number | null>({
  title,
  items,
  selected,
  onSelect,
  onClose,
  onSearch,
  loading = false,
  searchPlaceholder = 'Išči…',
  emptyText = 'Ni zadetkov.',
}: {
  title: string;
  items: PickerItem<T>[];
  selected?: T;
  onSelect: (value: T) => void;
  onClose: () => void;
  onSearch?: (query: string) => void;
  loading?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
}) {
  const theme = useTheme();
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const visible = onSearch || !q ? items : items.filter((i) => i.label.toLowerCase().includes(q));

  function changeQuery(text: string) {
    setQuery(text);
    onSearch?.(text);
  }

  return (
    <Shell
      title={title}
      overline="Izberi"
      onClose={onClose}
      search={<HeroSearch value={query} onChangeText={changeQuery} placeholder={searchPlaceholder} autoFocus={Platform.OS !== 'web'} />}>
      {loading && <ActivityIndicator color={theme.primary} style={styles.loading} />}
      {!loading && visible.length === 0 ? (
        <HeroTile>
          <ThemedText themeColor="textSecondary" style={[heroStyles.body, styles.center]}>
            {emptyText}
          </ThemedText>
        </HeroTile>
      ) : visible.length > 0 ? (
        <HeroTile style={styles.list}>
          {visible.map((item, i) => {
            const isSelected = item.value === selected;
            return (
              <View key={String(item.value)}>
                {i > 0 && <HeroSeparator inset={Spacing.three} />}
                <Pressable
                  onPress={() => onSelect(item.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  style={({ pressed }) => [styles.row, (pressed || isSelected) && { backgroundColor: theme.backgroundSelected }]}>
                  <View style={styles.rowText}>
                    <ThemedText style={[styles.rowLabel, isSelected && { color: theme.primary }]}>{item.label}</ThemedText>
                    {item.note && (
                      <ThemedText themeColor="textSecondary" style={heroStyles.meta}>
                        {item.note}
                      </ThemedText>
                    )}
                  </View>
                  {isSelected && <Icon ios="checkmark" md="check" size={20} color={theme.primary} />}
                </Pressable>
              </View>
            );
          })}
        </HeroTile>
      ) : null}
    </Shell>
  );
}

/** Izbira več elementov (npr. konji termina) — potrdi se z »Končano«. */
export function MultiPickerSheet<T extends string | number>({
  title,
  items,
  initial,
  onDone,
  onClose,
  hint,
}: {
  title: string;
  items: PickerItem<T>[];
  initial: T[];
  onDone: (values: T[]) => void;
  onClose: () => void;
  hint?: string;
}) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [values, setValues] = useState<T[]>(initial);

  const q = query.trim().toLowerCase();
  const visible = q ? items.filter((i) => i.label.toLowerCase().includes(q)) : items;

  function toggle(value: T) {
    setValues((current) => (current.includes(value) ? current.filter((v) => v !== value) : [...current, value]));
  }

  return (
    <Shell
      title={title}
      overline={`Izbranih: ${values.length}${hint ? ` · ${hint}` : ''}`}
      onClose={onClose}
      search={<HeroSearch value={query} onChangeText={setQuery} placeholder="Išči…" />}>
      <HeroPrimaryButton title={`Končano (${values.length})`} icon={{ ios: 'checkmark', md: 'check' }} onPress={() => onDone(values)} />
      <HeroTile style={styles.list}>
        {visible.map((item, i) => {
          const on = values.includes(item.value);
          return (
            <View key={String(item.value)}>
              {i > 0 && <HeroSeparator inset={Spacing.three} />}
              <Pressable
                onPress={() => toggle(item.value)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                aria-checked={on}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.backgroundSelected }]}>
                <View style={styles.rowText}>
                  <ThemedText style={[styles.rowLabel, on && { color: theme.primary }]}>{item.label}</ThemedText>
                  {item.note && (
                    <ThemedText themeColor="textSecondary" style={heroStyles.meta}>
                      {item.note}
                    </ThemedText>
                  )}
                </View>
                <View style={[styles.check, on ? { backgroundColor: theme.primary, borderColor: theme.primary } : { borderColor: theme.border }]}>
                  {on && <Icon ios="checkmark" md="check" size={16} color={theme.onPrimary} />}
                </View>
              </Pressable>
            </View>
          );
        })}
      </HeroTile>
    </Shell>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  loading: { paddingVertical: Spacing.four },
  list: { padding: Spacing.one },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 52,
    paddingHorizontal: Spacing.three - Spacing.one,
    paddingVertical: Spacing.two + Spacing.half,
    borderRadius: 14,
  },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, lineHeight: 20, fontWeight: 700 },
  check: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
