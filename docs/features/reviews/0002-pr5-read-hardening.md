# 0002. Review of PR #5, read hardening

- Pull request: https://github.com/brennersta/Happengo/pull/5
- Merge commit: `aa084d8`
- Gated head: `8361fc8`

## Areas

Event read hardening on top of the baseline: value converters and CHECK constraints, strict JSON numbers, the OpenAPI document, map-scope `end_at` inside `VisibleTo`, forwarded headers, the ArchUnitNET planted violation, and the review note for PR #3.

## Conflict rulings

The accepted ADRs won, and the merged `Initial` migration stayed immutable.

- `HardenStoredValues` adds the CHECKs and recreates `ix_events_location_geog` with `IF EXISTS` / `IF NOT EXISTS`. `20261116110349_Initial` is unchanged.
- Atlas, confirming ADR 0007: unlisted events are never on any map, including the owner's. The owner reads an unlisted event by id. A share link grants no map access.

## Gates

- Architecture: pass on `8361fc8`.
- QA: pass on `8361fc8`. CI run [43859873583](https://github.com/brennersta/Happengo/actions/runs/43859873583) reported 171 tests passed. `ci-success` was green. Squash-merged as `aa084d8`.

## What landed

- N1. Value converters throw on unknown visibility, approval mode, and attendance status. CHECK constraints cover those columns and the tag vocabulary.
- N2. JSON number handling is strict, so OpenAPI no longer types numbers as `integer|string` or `number|string`. `shareToken` is optional and nullable. `bbox` is required.
- QA. Map scope of `VisibleTo` requires `end_at > now`, including for the owner and attendees. Direct reads of an ended event still succeed for the owner and for `attending`.
- Nits. Placeholder authority and connection string live in `appsettings.Development.json`. Compose publishes Postgres on `127.0.0.1` only. `CursorPage` is gone. Forwarded headers run before the rate limiter and trust nothing unless configured. The ArchUnitNET test has a planted violation and fails on it.

## Branch cleanup

`git diff 8361fc893a34aa46b611d14bbba0399e6a58b370 aa084d894f5e5e629a040965e92b133cd8ab382e` is not empty. The trees differ by 37 files (`+1748`/`-19`): the infra layout from PR #4 (`cac9691`), which is the parent of the squash and is not on the feature branch (that branch is based on `980991e`).

The hardening patch is fully in main. `git diff 980991eaf018e76262acc8488d6cbada75148ddf 8361fc893a34aa46b611d14bbba0399e6a58b370` matches `git diff cac9691ef1a0b448973fbca4af617b38a3f928fb aa084d894f5e5e629a040965e92b133cd8ab382e`. On that patch equivalence, the remote branch `cursor/read-hardening-08a3` was deleted.

## Follow-ups

- [x] QA. The owner clause of `VisibleTo` is a positive allow-list. A new visibility stays hidden until it is listed. Not in the #5 squash; done with the security follow-ups.
- [ ] QA. Tags rely on `ck_events_tags`, not a throwing converter.
- [ ] QA. Down of `HardenStoredValues` leaves `ix_events_location_geog` (Initial owns it). That index is not in the model snapshot. Kept: ADR 0006.
