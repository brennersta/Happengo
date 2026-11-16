# 0001. Review of PR #3, backend baseline

- Pull request: https://github.com/brennersta/Happengo/pull/3
- Merge commit: `980991e`
- Gated head: `4e88fe1`

## Areas

Events read slice (`GET /v1/events`, `GET /v1/events/{id}`, `GET /v1/events/shared/{token}`), `VisibleTo`, the initial migration, JwtBearer and the anonymous-read fallback, OpenAPI, tests, and CI (`api` plus `ci-success`).

## Conflict rulings

The accepted ADRs won:

- An event ends at `end_at`. Happening now is `start_at <= now < end_at`.
- The column is `geometry(Point,4326)`, not `geography(Point)`.
- Unlisted events stay off the map, including for the owner.
- Opening a share link does not grant map visibility in v1.

## Gates

- Architecture: pass on `4e88fe1`.
- QA: pass on `4e88fe1`. CI run [43855991426](https://github.com/brennersta/Happengo/actions/runs/43855991426) reported 162 tests passed. Merge still needed a security sign-off; that review is separate from this note.

## Follow-ups

- [x] N1. Value converters throw on unknown visibility, approval mode, and attendance status. CHECK constraints cover those columns and the tag vocabulary.
- [x] N1. `HardenStoredValues` drops and recreates `ix_events_location_geog` with `IF EXISTS` / `IF NOT EXISTS`. The merged `Initial` migration is unchanged.
- [x] N2. JSON number handling is strict, so OpenAPI no longer types numbers as `integer|string` or `number|string`.
- [x] N2. `shareToken` is optional and nullable in the OpenAPI document. `bbox` is required.
- [x] QA. Map scope of `VisibleTo` itself requires `end_at > now`, including for the owner and attendees.
- [x] QA. Tests cover that map scope, and unknown stored visibility or status fails the read instead of leaking.
- [ ] QA. Broader probe matrix (rejected, cancelled-with-invite, and the rest of QA's extra cases). QA is adding those.
- [x] Nit. Placeholder authority and connection string live in `appsettings.Development.json`.
- [x] Nit. Compose publishes Postgres on `127.0.0.1` only.
- [x] Nit. Unused `CursorPage` is removed until a list endpoint needs cursor pagination.
- [x] Nit. Forwarded headers run before the rate limiter. Trusted networks and proxies come from configuration and default to empty.
- [x] Nit. The ArchUnitNET test has a planted violation and fails on it.
- [ ] Nit. Drop the geography GiST index. Kept: ADR 0006 says the radius path needs that index, and the architecture gate accepted `geometry(Point,4326)` plus the expression index.
