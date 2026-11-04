import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import {
  HeroEmpty,
  HeroPrimaryButton,
  HeroScreen,
  HeroTile,
  heroStyles,
} from '@/components/hero-screen';
import { Icon } from '@/components/icon';
import { Notice } from '@/components/notice';
import { OfflineBanner } from '@/components/offline-banner';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useApi } from '@/hooks/use-api';
import { useTheme } from '@/hooks/use-theme';
import { api, errorMessage } from '@/lib/api';
import { useConnectivity } from '@/lib/connectivity';
import { emitDataChanged } from '@/lib/data-version';
import { useSession } from '@/lib/session';
import type { CheckoutResponse, PurchaseCatalog } from '@/lib/types';

// Največja količina posamezne postavke v enem nakupu (kot na spletu)
const MAX_QTY = 50;

/** 30 → »30,00 €« (Intl z valuto na vseh napravah ni zanesljiv). */
function money(eur: number): string {
  const [whole, cents] = eur.toFixed(2).split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${cents} €`;
}

type Key = `single-${number}` | `package-${number}`;
type Result = 'success' | 'unknown' | null;

/**
 * Nakup kuponov: izbira v aplikaciji, plačilo s kartico na spletni strani kluba.
 * Strežnik izračuna ceno in vrne enkratno povezavo (/pay/{token}); po plačilu se stran vrne v aplikacijo.
 */
export default function PurchaseScreen() {
  const theme = useTheme();
  const { user } = useSession();
  const { isOnline } = useConnectivity();
  const canBuy = !!user?.permissions?.purchase_view;
  const { data, error, loading } = useApi<PurchaseCatalog>(isOnline && canBuy ? '/purchase/catalog' : null);
  const [qty, setQty] = useState<Partial<Record<Key, number>>>({});
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<Result>(null);

  const types = data?.coupon_types ?? [];
  const packages = data?.coupon_packages ?? [];
  const lines = [
    ...types.map((t) => ({ key: `single-${t.id}` as Key, kind: 'single' as const, id: t.id, name: t.name, price: t.price })),
    ...packages.map((p) => ({ key: `package-${p.id}` as Key, kind: 'package' as const, id: p.id, name: p.name, price: p.price })),
  ].filter((l) => (qty[l.key] ?? 0) > 0);
  const total = lines.reduce((sum, l) => sum + l.price * (qty[l.key] ?? 0), 0);

  function change(key: Key, delta: number) {
    setResult(null);
    setQty((q) => ({ ...q, [key]: Math.max(0, Math.min(MAX_QTY, (q[key] ?? 0) + delta)) }));
  }

  async function pay() {
    setBusy(true);
    setSubmitError(null);
    setResult(null);
    try {
      const returnUrl = Linking.createURL('purchase-done');
      const checkout = await api.post<CheckoutResponse>('/purchase/checkout', {
        items: lines.map((l) => ({ kind: l.kind, id: l.id, qty: qty[l.key] })),
        return_url: returnUrl,
      });
      // Brskalnik v aplikaciji se zapre, ko stran po plačilu preusmeri na returnUrl
      const session = await WebBrowser.openAuthSessionAsync(checkout.url, returnUrl);
      const paid = session.type === 'success' && Linking.parse(session.url).queryParams?.status === 'success';
      setResult(paid ? 'success' : 'unknown');
      if (paid) setQty({});
      // Stanje kuponov osvežimo tudi, če je uporabnik brskalnik zaprl sam (plačilo je morda uspelo)
      emitDataChanged();
    } catch (e) {
      setSubmitError(errorMessage(e, 'Nakupa ni bilo mogoče začeti.'));
    } finally {
      setBusy(false);
    }
  }

  const count = Object.values(qty).reduce((n: number, v) => n + (v ?? 0), 0);

  return (
    <HeroScreen
      overline="Nakup kuponov"
      title={result === 'success' ? 'Hvala za nakup' : total > 0 ? `Skupaj ${money(total)}` : 'Izberi kupone'}
      back="/coupons">
      <OfflineBanner />

      {result === 'success' && (
        <HeroTile style={styles.result}>
          <View style={[styles.resultIcon, { backgroundColor: theme.successSoft }]}>
            <Icon ios="checkmark.circle.fill" md="check_circle" size={32} color={theme.success} />
          </View>
          <ThemedText style={styles.resultTitle}>Plačilo je uspelo</ThemedText>
          <ThemedText themeColor="textSecondary" style={[heroStyles.body, styles.center]}>
            Kuponi so dodani na tvoj račun.
          </ThemedText>
          <View style={styles.resultAction}>
            <HeroPrimaryButton title="Na moje kupone" onPress={() => router.navigate('/coupons')} />
          </View>
          <Pressable onPress={() => setResult(null)} hitSlop={8} accessibilityRole="button">
            <ThemedText style={[styles.again, { color: theme.primary }]}>Kupi še</ThemedText>
          </Pressable>
        </HeroTile>
      )}
      {result === 'unknown' && (
        <Notice
          tone="warning"
          text="Plačilo ni bilo potrjeno. Če je bilo plačilo izvedeno, se kuponi prikažejo pod Kuponi v nekaj trenutkih."
        />
      )}

      {result === 'success' ? null : !canBuy ? (
        <HeroEmpty
          icon={{ ios: 'cart', md: 'shopping_cart' }}
          title="Nakup ni na voljo"
          text="Tvoj račun nima dovoljenja za nakup kuponov. Za kupone se obrni na klub."
        />
      ) : !isOnline ? (
        <HeroEmpty
          icon={{ ios: 'wifi.slash', md: 'wifi_off' }}
          title="Brez povezave"
          text="Nakup kuponov je mogoč samo s povezavo."
        />
      ) : loading && !data ? (
        <ActivityIndicator color={theme.primary} style={styles.loading} />
      ) : error && !data ? (
        <HeroEmpty icon={{ ios: 'cart', md: 'shopping_cart' }} title="Napaka pri nalaganju" text={error} />
      ) : types.length + packages.length === 0 ? (
        <HeroEmpty
          icon={{ ios: 'cart', md: 'shopping_cart' }}
          title="Ni ponudbe"
          text="Klub trenutno nima kuponov za spletni nakup."
        />
      ) : (
        <>
          {types.length > 0 && (
            <View style={styles.section}>
              <ThemedText style={[heroStyles.label, heroStyles.sectionLabel, { color: theme.primary }]}>
                Posamezni kuponi
              </ThemedText>
              <HeroTile style={styles.list}>
                {types.map((t, i) => (
                  <View key={t.id}>
                    {i > 0 && <View style={[styles.separator, { backgroundColor: theme.border }]} />}
                    <OfferRow
                      icon="ticket"
                      title={t.name}
                      detail={`${money(t.price)} / kupon`}
                      qty={qty[`single-${t.id}`] ?? 0}
                      onChange={(d) => change(`single-${t.id}`, d)}
                    />
                  </View>
                ))}
              </HeroTile>
            </View>
          )}

          {packages.length > 0 && (
            <View style={styles.section}>
              <ThemedText style={[heroStyles.label, heroStyles.sectionLabel, { color: theme.primary }]}>Paketi</ThemedText>
              <HeroTile style={styles.list}>
                {packages.map((p, i) => {
                  const typeName = types.find((t) => t.id === p.coupon_type_id)?.name;
                  return (
                    <View key={p.id}>
                      {i > 0 && <View style={[styles.separator, { backgroundColor: theme.border }]} />}
                      <OfferRow
                        icon="package"
                        title={p.name}
                        detail={`${p.quantity} × ${typeName ?? 'kupon'} · ${money(p.price)}`}
                        note={`${money(p.price / p.quantity)} na kupon`}
                        qty={qty[`package-${p.id}`] ?? 0}
                        onChange={(d) => change(`package-${p.id}`, d)}
                      />
                    </View>
                  );
                })}
              </HeroTile>
            </View>
          )}

          {lines.length > 0 && (
            <HeroTile style={styles.summary}>
              <ThemedText style={[heroStyles.label, { color: theme.primary }]}>Povzetek</ThemedText>
              {lines.map((l) => (
                <View key={l.key} style={styles.summaryRow}>
                  <ThemedText style={[heroStyles.body, styles.flex]}>
                    {l.name} × {qty[l.key]}
                  </ThemedText>
                  <ThemedText style={styles.summaryAmount}>{money(l.price * (qty[l.key] ?? 0))}</ThemedText>
                </View>
              ))}
              <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
                <ThemedText style={[styles.totalLabel, styles.flex]}>Skupaj</ThemedText>
                <ThemedText style={styles.totalAmount}>{money(total)}</ThemedText>
              </View>
            </HeroTile>
          )}

          {submitError && <Notice tone="danger" text={submitError} />}

          <HeroPrimaryButton
            title={count > 0 ? `Na plačilo · ${money(total)}` : 'Izberi vsaj en kupon'}
            icon={{ ios: 'creditcard', md: 'credit_card' }}
            onPress={pay}
            loading={busy}
            disabled={count === 0 || !isOnline}
          />
          <View style={styles.secure}>
            <Icon ios="lock.shield" md="verified_user" size={16} color={theme.textSecondary} />
            <ThemedText themeColor="textSecondary" style={[heroStyles.meta, styles.flex]}>
              Plačilo s kartico poteka na varni spletni strani kluba (Stripe). Ponovna prijava ni potrebna, povezava velja 30
              minut.
            </ThemedText>
          </View>
        </>
      )}
    </HeroScreen>
  );
}

function OfferRow({
  icon,
  title,
  detail,
  note,
  qty,
  onChange,
}: {
  icon: 'ticket' | 'package';
  title: string;
  detail: string;
  note?: string;
  qty: number;
  onChange: (delta: number) => void;
}) {
  const theme = useTheme();
  const active = qty > 0;
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: active ? theme.primary : theme.backgroundSelected }]}>
        <Icon
          ios={icon === 'ticket' ? 'ticket' : 'shippingbox'}
          md={icon === 'ticket' ? 'confirmation_number' : 'inventory_2'}
          size={20}
          color={active ? theme.onPrimary : theme.textSecondary}
        />
      </View>
      <View style={styles.flex}>
        <ThemedText style={heroStyles.tileTitle} numberOfLines={2}>
          {title}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={heroStyles.meta}>
          {detail}
        </ThemedText>
        {note && <ThemedText style={[heroStyles.meta, { color: theme.success }]}>{note}</ThemedText>}
      </View>
      <View style={styles.stepper}>
        <StepButton label={`Manj: ${title}`} icon="minus" disabled={qty === 0} onPress={() => onChange(-1)} />
        <ThemedText style={styles.qty} accessibilityLabel={`Količina: ${qty}`}>
          {qty}
        </ThemedText>
        <StepButton label={`Več: ${title}`} icon="plus" disabled={qty >= MAX_QTY} onPress={() => onChange(1)} />
      </View>
    </View>
  );
}

function StepButton({ label, icon, disabled, onPress }: { label: string; icon: 'plus' | 'minus'; disabled: boolean; onPress: () => void }) {
  const theme = useTheme();
  const plus = icon === 'plus';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.step,
        { backgroundColor: plus ? theme.primary : theme.backgroundSelected },
        disabled && styles.stepDisabled,
        pressed && heroStyles.pressed,
      ]}>
      <Icon ios={plus ? 'plus' : 'minus'} md={plus ? 'add' : 'remove'} size={18} color={plus ? theme.onPrimary : theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  loading: { paddingVertical: Spacing.five },
  section: { gap: 10 },
  list: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: Spacing.three - Spacing.one, paddingHorizontal: Spacing.three - Spacing.one },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  separator: { height: 1, marginLeft: 64, marginRight: Spacing.three },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  step: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepDisabled: { opacity: 0.35 },
  qty: { minWidth: 24, textAlign: 'center', fontSize: 16, lineHeight: 20, fontWeight: 800 },
  summary: { gap: Spacing.two },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  summaryAmount: { fontSize: 14, lineHeight: 18, fontWeight: 700 },
  totalRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingTop: Spacing.two, marginTop: Spacing.one },
  totalLabel: { fontSize: 15, lineHeight: 20, fontWeight: 800 },
  totalAmount: { fontSize: 20, lineHeight: 24, fontWeight: 800 },
  secure: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, paddingHorizontal: Spacing.one },
  result: { alignItems: 'center', gap: 12, paddingVertical: Spacing.four },
  resultIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontSize: 18, lineHeight: 24, fontWeight: 800 },
  resultAction: { alignSelf: 'stretch', marginTop: Spacing.one },
  again: { fontSize: 14, lineHeight: 20, fontWeight: 700, paddingVertical: Spacing.one },
});
