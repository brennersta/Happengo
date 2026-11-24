# Review 0015: Join request names

## Scope

- The owner-only pending-request endpoint returns each requester's user ID, display name, and request timestamp. It selects no email or other profile fields.
- `Attendance.CreatedAt` already records when a request was made, so no migration was required; the API exposes it as `requestedAt`.
- Owner event detail shows the display name and localized relative request time, with the existing Approve and Reject actions.
- Both demo mock layers use the updated response contract. Added English and Brazilian Portuguese strings.

## Validation

- `dotnet build backend/Happengo.sln --configuration Release --disable-build-servers` — passed, 0 warnings and 0 errors.
- `dotnet test backend/tests/Happengo.Api.Tests/Happengo.Api.Tests.csproj --configuration Release --no-build --filter FullyQualifiedName~FeatureBoundaryTests` — passed, 2 tests.
- OpenAPI export test in update mode — passed, 1 test; regenerated `api/openapi.json`. `node ./scripts/generate.mjs` from `packages/api-client` regenerated the TypeScript client.
- OpenAPI drift check with `UPDATE_OPENAPI` unset — passed, 1 test.
- `dotnet test backend/Happengo.sln --configuration Release --logger 'console;verbosity=quiet'` — 39 passed, 199 failed because Docker is unavailable (`npipe://./pipe/dockerDesktopLinuxEngine`). The database-backed attendance integration test could not run without the PostGIS Testcontainers fixture.
- `pnpm --filter @happengo/mobile test --runInBand` — passed, 25 suites and 76 tests.
- `pnpm --filter @happengo/mobile typecheck` — passed.
- `pnpm --filter @happengo/mobile lint` — passed.
- `pnpm --filter @happengo/mobile export:web` — passed.
