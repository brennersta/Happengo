# Review 0026: Event pin click regression

## Finding and change

- Discover cleared the selected marker preview on `onMapPress`. The installed MapLibre web `Marker` dispatches the marker click and lets it propagate to the map's click handler; Discover therefore selected the marker and immediately cleared the preview. The user saw no response when tapping an event.
- Removed map-tap dismissal from Discover. Pin selection now remains visible until the person closes the preview or selects another pin. Map tap handling remains available on the event and incident creation pickers.
- Updated `GROK.md` to record that PR #40 has merged, and updated the handoff with the same current status.

## Validation

- `pnpm --filter @happengo/mobile lint` — passed.
- `pnpm --filter @happengo/mobile typecheck` — passed (`tsc --noEmit`).
- `pnpm --filter @happengo/mobile export:web` — passed; Expo exported to `apps/mobile/dist`.
- Jest was not run.
