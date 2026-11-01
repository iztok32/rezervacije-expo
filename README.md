# Rezervacije (Expo)

Mobilna aplikacija (Android / iOS) za spletno aplikacijo `kk-karlo-bb` (Laravel).

## Zagon

```bash
npm install
cp .env.example .env   # nastavi EXPO_PUBLIC_API_URL
npx expo start         # skeniraj QR kodo z aplikacijo Expo Go
```

## Struktura

- `src/app/` – zasloni (Expo Router, vsaka datoteka je pot)
- `src/lib/api.ts` – klient za Laravel `/api/*` (Bearer žeton Sanctum)
- `src/lib/token-storage.ts` – varna hramba žetona (SecureStore)
