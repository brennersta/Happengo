# Review 0012: Edit and cancel events

**Date:** 2026-11-23
**Branch:** codex/edit-cancel-event
**Scope:** owner-only event editing and cancellation, cancelled-event discovery and attendance behavior, mobile detail/form flows, and demo mocks.

## Changes

- Added owner-only `PATCH /v1/events/{eventId}`. It reuses create validation, preserves visibility and approval mode, keeps selected-tag order, replaces invited friend tags, and returns 409 for ended events.
- Added owner-only `POST /v1/events/{eventId}/cancel` and the new nullable `cancelled_at` column in a new migration saved as UTF-8 without a BOM.
- Map/discovery visibility excludes cancelled events; direct reads still use `VisibleTo`, include `cancelledAt`, and My Events retains owner events with their cancellation state. Joining a cancelled event returns ProblemDetails 409.
- Added detail-screen edit and confirm-cancel actions, a cancelled banner, disabled joining for cancelled events, and an edit form prefilled from the event. Added English and Brazilian Portuguese strings and updated both demo mock adapters.
- Regenerated OpenAPI and TypeScript API client. No infrastructure, deployment, or other migration changes.

## Verification

- `dotnet test backend/tests/Happengo.Api.Tests/Happengo.Api.Tests.csproj --configuration Release --no-restore --filter FullyQualifiedName~OpenApi_document_matches_committed_contract` — 1 passed.
- `dotnet test backend/Happengo.sln --configuration Release` — 235 passed, 0 failed, 0 skipped.
- `pnpm --filter @happengo/mobile test --runInBand` — 22 suites and 69 tests passed.
- `pnpm --filter @happengo/mobile typecheck` — passed.
- Focused `EditEventTests` and `CancelEventTests` — 6 passed before the final full-suite run.
