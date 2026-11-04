import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';

/**
 * Ikona: SF Symbol na iOS, Material Symbol na Androidu in spletu (expo-symbols).
 * Okrasna — pomen nosi napis ali accessibilityLabel gumba okoli nje.
 */
export function Icon({
  ios,
  md,
  size = 22,
  color,
}: {
  ios: SFSymbol;
  md: AndroidSymbol;
  size?: number;
  color: string;
}) {
  return (
    <SymbolView
      name={{ ios, android: md, web: md }}
      size={size}
      tintColor={color}
      weight="semibold"
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
