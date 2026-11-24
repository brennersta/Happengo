# Review 0012: Start at my location

**Date:** 2026-11-24
**Branch:** codex/start-at-my-location
**Scope:** Discover map startup location, permission-gated location button, on-device last-map-view persistence, and mobile configuration.

## Changes

- On startup, check location permission without prompting. If already granted, center on the current device position; otherwise restore the saved map center and zoom, then fall back to Tallinn.
- Add a Locate me button that requests foreground location only after a tap. A denied or unavailable location shows a brief, non-blocking message.
- Store only the last map center and zoom on device: SecureStore on iOS/Android and localStorage on web. Device location is used only to center the map; event requests continue to use the map viewport query.
- Add localized English and Brazilian Portuguese strings, iOS purpose text, Android foreground-location permissions, and keep the browser demo on the browser geolocation API.
- Add fallback-order and saved-view validation tests. No backend, migration, or infrastructure changes.

## Verification

- `pnpm --filter @happengo/mobile test --runInBand` — 22 suites and 68 tests passed.
- `pnpm --filter @happengo/mobile typecheck` — passed.
- `pnpm --filter @happengo/mobile export:web` — passed; Expo exported the web app to `apps/mobile/dist`.
