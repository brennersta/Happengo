# Review 0018: Map marker alignment

## Scope

- Web markers leave `position`, `top`, `left`, and `transform` to MapLibre. Their aura and pin are inside a relative 36×46 wrapper, and the rotated pin tip meets the wrapper's bottom-center anchor.
- Native MapLibre markers use `anchor="bottom"`; the pin tip is laid out at the bottom-center of its 40×48 container.
- Live aura animation and marker accessibility labels are preserved. The popup offset remains 16px.
- Added a web marker factory Jest test for an unpositioned outer element and the bottom anchor.

## Validation

- `pnpm --filter @happengo/mobile lint` — passed.
- `pnpm --filter @happengo/mobile typecheck` — passed.
- `pnpm --filter @happengo/mobile test --runInBand` — passed, 26 suites and 78 tests.
- `pnpm --filter @happengo/mobile export:web` — passed.
