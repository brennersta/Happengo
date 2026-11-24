# Review 0014: Profile tab

## Scope

- Added authenticated `GET /v1/me` and `PUT /v1/me/display-name` endpoints.
- Display names are trimmed and constrained to 1–40 characters.
- Existing user display names are preserved during subsequent identity claim synchronization; no schema change was needed.
- The signed-in Profile tab loads and edits the name, switches between English and Brazilian Portuguese, and signs out. The preference is stored on the device.
- Added both API demo handlers and tests for profile mock behavior.

## Validation

## Validation run

- `dotnet test backend/tests/Happengo.Api.Tests/Happengo.Api.Tests.csproj --configuration Release --filter FullyQualifiedName~OpenApi_document_matches_committed_contract` — passed, 1 test.
- `dotnet test backend/Happengo.sln --configuration Release` — 39 passed, 199 failed because Testcontainers could not connect to Docker (`npipe://./pipe/docker_engine`). The profile integration tests require that PostgreSQL fixture and could not run in this environment.
- `pnpm --filter @happengo/mobile test --runInBand --forceExit` — passed, 24 suites and 74 tests.
- `pnpm --filter @happengo/mobile typecheck` — passed.
- `node ./scripts/generate.mjs` from `packages/api-client` — regenerated the TypeScript client after the backend OpenAPI export test updated `api/openapi.json`.
