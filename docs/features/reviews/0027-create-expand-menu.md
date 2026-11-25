# Review 0027: Expand create options from Discover

## Finding and change

- The Create action opened a full-screen choice page before the person could choose between creating an event and reporting an incident.
- Changed the Discover Create button to expand a compact menu with the existing event and incident actions. Selecting an option opens its form directly; tapping outside or tapping Create again closes the menu.
- Direct navigation to `/events/create` now opens the event form, while event editing continues to load the existing event by id.
- Added English and Brazilian Portuguese accessible labels for the menu and its dismissal action.

## Validation

- `pnpm --filter @happengo/mobile lint` — passed.
- `pnpm --filter @happengo/mobile typecheck` — passed (`tsc --noEmit`).
- `pnpm --filter @happengo/mobile export:web` — passed; Expo exported to `apps/mobile/dist`.
- Jest was not run.
