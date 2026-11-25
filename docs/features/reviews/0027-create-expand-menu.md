# Review 0027: Expand create options from Discover

## Finding and change

- The Create action opened a full-screen choice page before the person could choose between creating an event and reporting an incident.
- Changed the Discover Create button to expand a compact menu with the existing event and incident actions. Selecting an option opens its form directly; tapping outside or tapping Create again closes the menu.
- Direct navigation to `/events/create` now opens the event form, while event editing continues to load the existing event by id.
- Removed the editable IANA time-zone field. New events use the device's local time zone automatically; edits keep the event's existing time zone so editing does not shift its scheduled instant.
- Visibility and participation now show dropdown chevrons and open option menus over the form. Opening either menu no longer pushes the submit button down the page.
- Added English and Brazilian Portuguese strings for the local-time explanation and accessible menu labels.

## Validation

- `pnpm --filter @happengo/mobile lint` — passed.
- `pnpm --filter @happengo/mobile typecheck` — passed (`tsc --noEmit`).
- `pnpm --filter @happengo/mobile export:web` — passed after rerunning with permission to write generated Expo assets under `apps/mobile/dist`; the sandboxed attempt returned `EPERM`.
- Jest was not run.
