# 0001. Repo layout, TypeScript client, and map stack

- Status: Accepted
- Date: 2026-11-16

## Context

Happengo is one Expo client for iOS, Android, and web, calling one ASP.NET Core API ([ADR 0002](0002-stack-and-modular-monolith.md)). A solo developer has to install, generate a typed client, and show a map without a second monorepo tool or a vendor map SDK. The backend owns the OpenAPI document at `api/openapi.json`. The IdP is still open in [ADR 0005](0005-authentication.md). Geocoding stays open in [ADR 0006](0006-geo-queries.md).

## Decision

pnpm workspaces at the repo root. No Turborepo, Nx, or changesets. `.npmrc` sets `node-linker=hoisted` so Metro can resolve packages.

- `apps/mobile` — one Expo app (TypeScript, expo-router) for iOS, Android, and web
- `packages/api-client` — generated TypeScript client
- `backend/`, `infra/`, and `docs/` stay where [ADR 0002](0002-stack-and-modular-monolith.md) put them

`pnpm api:generate` reads `api/openapi.json`. Types come from `openapi-typescript`. Calls go through `openapi-fetch` and `openapi-react-query` (TanStack Query). Not orval. Tag values come from that document's `EventTag` enum. In development the app mocks the same contract with MSW. This ADR does not choose a geocoding provider.

Maps use MapLibre and no vendor SDK. Native uses `@maplibre/maplibre-react-native` with its Expo config plugin and a development build (`expo-dev-client`). It does not run in Expo Go. Web uses `maplibre-gl`. Screens import one map component (`Map.native.tsx` / `Map.web.tsx`) and do not branch on platform. The style URL is `EXPO_PUBLIC_MAP_STYLE_URL`. An optional key is `EXPO_PUBLIC_MAP_API_KEY`, substituted only when the URL contains `{key}`. The default style is OpenFreeMap Positron (`https://tiles.openfreemap.org/styles/positron`), which needs no key. The default center is Tallinn. Web sets `renderWorldCopies` to false.

Auth is a seam, not a provider. One `auth` module exposes a stub for the flow in [ADR 0005](0005-authentication.md): OIDC authorization code with PKCE, a short-lived bearer access token, and a refresh token kept in `expo-secure-store` on native and never in `localStorage` on web. An `openapi-fetch` middleware attaches the bearer token. No IdP is wired.

## Consequences

- One lockfile and one install. Expo and the client package do not need a task runner.
- The generated client follows `api/openapi.json`. A change to that file needs `pnpm api:generate`.
- Native maps require a dev build. Expo Go cannot load the MapLibre native module. The native wrapper does not expose world-copy control, so a dev build can still repeat the world horizontally. Web does not.
- OpenFreeMap is the default tile host. Changing provider is an env change, as long as the style is MapLibre style JSON.
- Sign-in does nothing until the IdP is chosen. The stub sends no token, so anonymous discovery still matches the product.
- `openapi-typescript`, `openapi-fetch`, and `openapi-react-query` are in maintenance and receive no further releases. This ADR keeps them: the client is generated types plus a small fetch wrapper.
