# Review 0020: Incidents in the mobile app

## Decisions

- Discover combines events and active incidents for the same visible map bounds; the type selector defaults to All.
- Incident pins and cards use a warning color and category icon so they remain distinct from event pins.
- Incident reports require a signed-in user, a category, a short description, and a selected location.
- Reporter identity is never displayed. The API response only controls whether the current user can close their own report.
- Incident votes are changeable and refresh the incident detail and Discover feed.

## Implementation

- Add a shared Discover merge/filter helper and unit tests for its selector behavior.
- Add incident creation, detail, vote, and reporter close flows, plus demo API fixtures and routes.
- Add English and Brazilian Portuguese strings.

## Validation

- `pnpm --filter @happengo/mobile lint` — passed.
- `pnpm --filter @happengo/mobile typecheck` — passed.
- `pnpm --filter @happengo/mobile test --runInBand` — passed, 27 suites and 80 tests.
- `pnpm --filter @happengo/mobile export:web` — passed.
