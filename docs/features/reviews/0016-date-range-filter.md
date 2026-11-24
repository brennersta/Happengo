# Review 0016: Date-range filter

## Scope

- `GET /v1/events` accepts `when=now|today|weekend|next7days`; omitted values retain the existing live and upcoming behavior.
- The optional `timeZoneId` query parameter accepts IANA zone IDs and defaults to `Europe/Tallinn`. Today and weekend use local midnight boundaries; next7days spans the current instant to the same local time seven calendar days later.
- Date filters include events overlapping the selected window and continue to apply the map `VisibleTo` rules, excluding ended and cancelled events.
- Discover has a When filter with Now, Today, This weekend, and Next 7 days. It sends the device time zone and retains its chosen value for the mounted session. English and Brazilian Portuguese translations and both demo mock layers are updated.
- The event maximum duration remains seven days. No database migration is needed.

## Validation

- `dotnet build backend/Happengo.sln --disable-build-servers -m:1` — passed, 0 warnings and 0 errors.
- Full `dotnet format backend/Happengo.sln --verify-no-changes` — reports repository-wide CRLF/LF and whitespace differences in the Windows checkout. Scoped verification for all modified C# files passed.
- OpenAPI export and drift test — passed, 3 tests; `api/openapi.json` and the generated TypeScript client were refreshed.
- `pnpm --filter @happengo/mobile lint` — passed.
- `pnpm --filter @happengo/mobile typecheck` — passed.
- `pnpm --filter @happengo/mobile test` — passed, 25 suites and 76 tests.
- `pnpm --filter @happengo/mobile export:web` — passed.
- Database-backed integration tests were not run locally because Docker is unavailable; CI runs the full suite.
