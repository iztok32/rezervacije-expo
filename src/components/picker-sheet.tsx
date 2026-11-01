import { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PickerItem<T extends string | number | null> = {
  value: T;
  label: string;
  note?: string;
};

/**
 * Izbira s seznama v celozaslonskem oknu (na telefonu bolj pregledno kot spustni meni).
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
    <Modal
      visible
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={onClose}>
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <ThemedText type="smallBold" style={styles.title}>
              {title}
            </ThemedText>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
              <ThemedText type="linkPrimary">Zapri</ThemedText>
            </Pressable>
          </View>
          <View style={styles.searchWrap}>
            <TextInput
              value={query}
              onChangeText={changeQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={theme.textSecondary}
              autoFocus={Platform.OS !== 'web'}
              autoCorrect={false}
              style={[styles.search, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
          </View>
          {loading && <ActivityIndicator style={styles.loading} />}
          <FlatList
            data={visible}
            keyExtractor={(item) => String(item.value)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              loading ? undefined : (
                <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                  {emptyText}
                </ThemedText>
              )
            }
            renderItem={({ item }) => {
              const isSelected = item.value === selected;
              return (
                <Pressable
                  onPress={() => onSelect(item.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  style={({ pressed }) => [
                    styles.row,
                    { borderBottomColor: theme.backgroundSelected },
                    (pressed || isSelected) && { backgroundColor: theme.backgroundElement },
                  ]}>
                  <View style={styles.rowText}>
                    <ThemedText style={isSelected && { color: theme.primary }}>{item.label}</ThemedText>
                    {item.note && (
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.note}
                      </ThemedText>
                    )}
                  </View>
                  {isSelected && <ThemedText style={{ color: theme.primary }}>✓</ThemedText>}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </ThemedView>
    </Modal>
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
  title: { flex: 1, fontSize: 18 },
  searchWrap: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.three },
  search: { borderRadius: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, fontSize: 16 },
  loading: { marginTop: Spacing.three },
  list: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingBottom: Spacing.five },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
    minHeight: 52,
  },
  rowText: { flex: 1, gap: Spacing.half },
  empty: { textAlign: 'center', marginTop: Spacing.four },
});

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
    <Modal
      visible
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={onClose}>
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
              <ThemedText type="linkPrimary">Prekliči</ThemedText>
            </Pressable>
            <ThemedText type="smallBold" style={[styles.title, { textAlign: 'center' }]}>
              {title}
            </ThemedText>
            <Pressable onPress={() => onDone(values)} hitSlop={12} accessibilityRole="button">
              <ThemedText type="linkPrimary" style={{ fontWeight: 700 }}>
                Končano
              </ThemedText>
            </Pressable>
          </View>
          <View style={styles.searchWrap}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Išči…"
              placeholderTextColor={theme.textSecondary}
              autoCorrect={false}
              style={[styles.search, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: Spacing.one }}>
              Izbranih: {values.length}
              {hint ? ` · ${hint}` : ''}
            </ThemedText>
          </View>
          <FlatList
            data={visible}
            keyExtractor={(item) => String(item.value)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const on = values.includes(item.value);
              return (
                <Pressable
                  onPress={() => toggle(item.value)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  style={[styles.row, { borderBottomColor: theme.backgroundSelected }]}>
                  <View style={styles.rowText}>
                    <ThemedText style={on && { color: theme.primary }}>{item.label}</ThemedText>
                    {item.note && (
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.note}
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText style={{ color: on ? theme.primary : theme.textSecondary, fontSize: 20 }}>
                    {on ? '☑' : '☐'}
                  </ThemedText>
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}
