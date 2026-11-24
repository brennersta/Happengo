# Review 0020: Incidents backend

## Scope

Added ADR 0012 and the first backend slice for public incidents, including persistence, read and write endpoints, per-user daily report limit, voting, automatic community close, and explicit reporter close. Reporter identity remains internal, and the Events feature remains independent.

## Decisions

- Active status is computed from the two-hour confirmation window and the twelve-hour hard cap.
- The requested review number 0019 was already assigned to housekeeping on main, so this note uses the next free number, 0020.

## Follow-up

- Match the API's timestamp contract by returning `DateTimeOffset` values, serialized as RFC 3339 date-time strings.
- Validate incident fields before checking the daily quota; the per-user advisory lock and transaction still cover the quota count and insert.
- Reflow the quota condition to satisfy formatting on the changed incident files.

## Validation

- `dotnet build backend/Happengo.sln --disable-build-servers -m:1` — passed, 0 warnings and 0 errors.
- Focused changed-file `dotnet format ... --verify-no-changes --include ...` — passed. The requested full-solution `dotnet format backend/Happengo.sln --verify-no-changes --no-restore` reports existing whitespace and line-ending violations in unrelated files.
- OpenAPI drift tests — 3 passed; OpenAPI and TypeScript client regenerated, and `pnpm --filter @happengo/api-client typecheck` passed.
- Incident expiry tests — 3 passed. Feature-boundary tests — 3 passed.
- Incident HTTP integration tests were attempted; the 3 database-backed tests could not start because Docker is unavailable in this environment. The incident tests should be rerun with Docker/PostGIS running.
- `dotnet ef migrations has-pending-model-changes` — no pending model changes.
