# Review 0017: Friends going to an event

## Scope

- Added a default-on per-user preference to share approved attendance with friends. The setting is returned by `GET /v1/me` and updated by `PUT /v1/me/attendance-sharing`.
- Event list and detail responses include `friendsGoing` for signed-in viewers: a count and up to three display names from their friends who are attending and opted in. Pending requests, non-friends, and the viewer are excluded; anonymous event responses omit the field. No email or other profile data is selected.
- The map-list enrichment is batched into one friends-attendance query for all returned events.
- The follow-up keeps the EF query over attendance, users, and accepted friendship rows until its final projection, avoiding composed positional-record projections that EF could not translate. The query lives in persistence so Friends does not depend on internal Attendance or Identity entities.
- Test API hosts now print unhandled exceptions and return exception details in test ProblemDetails, improving CI diagnostics without changing production error responses.
- Event detail and map-list cards show the friend attendance, and Profile includes the sharing toggle. English and Brazilian Portuguese strings and demo API mocks are updated.
- Added migration `AttendanceSharing` with a default of true for existing users.

## Validation

- `dotnet build Happengo.sln --disable-build-servers` — passed, 0 warnings and 0 errors.
- `dotnet format Happengo.sln --verify-no-changes --no-restore --include <changed backend C# files>` — passed. The requested solution-wide format check reported existing formatting differences across untouched backend files, including line-ending differences; changed backend C# files were formatted and the scoped verification passed.
- OpenAPI export test in update mode — passed, 3 tests; regenerated `api/openapi.json`. `pnpm --filter @happengo/api-client generate` regenerated the TypeScript client.
- OpenAPI drift check with update mode unset — passed, 3 tests.
- Focused `FriendsGoingTests` and `ProfileRouteTests` — unable to run because Docker is unavailable (`npipe://./pipe/docker_engine`); their shared PostGIS Testcontainers fixture cannot start. The combined focused run had 3 OpenAPI tests pass and 8 database-backed tests fail at fixture startup.
- Follow-up: `dotnet build Happengo.sln --disable-build-servers` — passed, 0 warnings and 0 errors; `dotnet format` verification on changed C# files — passed; `FeatureBoundaryTests` — passed, 2 tests; OpenAPI drift — passed, 3 tests.
- `pnpm --filter @happengo/mobile lint` — passed.
- `pnpm --filter @happengo/mobile typecheck` — passed.
- `pnpm --filter @happengo/mobile test --runInBand` — passed, 25 suites and 77 tests.
- `pnpm --filter @happengo/mobile export:web` — passed.
