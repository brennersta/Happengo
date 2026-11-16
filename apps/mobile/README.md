# Happengo mobile

One Expo app for iOS, Android, and web. From the repo root:

```bash
pnpm install
pnpm --filter @happengo/mobile web
```

Web opens the Discover map (OpenFreeMap, centered on Tallinn). The other tabs are placeholders.

Native MapLibre is not in Expo Go. Make a development build, then start Metro:

```bash
pnpm --filter @happengo/mobile exec expo run:ios
pnpm --filter @happengo/mobile exec expo run:android
```

Copy `.env.example` to `.env` to override the map style or the API URL. `EXPO_PUBLIC_API_MOCK=false` turns the contract mocks off.

`pnpm api:generate` regenerates `packages/api-client` from `api/openapi.json`.
