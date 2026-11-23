# 0005. Review of the first event journey

- Pull request: https://github.com/brennersta/Happengo/pull/15
- Branch: `cursor/first-event-journey-c78e`
- Draft commit, kept intact: `7fe87d2`
- Main merged in: `a53aad6` (PR #11, `b2d2e1a`)

## Areas

Event create with ordered tags, `GET /v1/events/mine`, attendance join/approve/decline, web and native pin color and live aura, OpenAPI and the generated client, the provider-agnostic auth docs, and the Terraform `PGCRYPTO` allow-list. No Azure apply.

## Validation checklist

- [x] Draft commit is separate from the fixes. Main was merged, not rebased.
- [x] Half-open window: happening while `start_at <= now < end_at`, ended at `end_at`. Aura, map query, and API agree.
- [x] PR #11 behavior kept: hashed share tokens, no `shareToken` on reads, owner allow-list, 429 ProblemDetails on map and share reads.
- [x] Tag order survives create and read. The first tag is the main tag.
- [x] `GET /v1/events/mine` returns only the caller's owned, attending, and requested events, and rejects anonymous calls.
- [x] `api/openapi.json` matches the API. Regenerating the TypeScript client makes no diff.
- [x] `dotnet format --verify-no-changes` and `dotnet test` (210 passed, PostGIS included).
- [x] pnpm lint, `tsc --noEmit`, and tests for `apps/` and `packages/`.
- [x] Web export walked in Chromium: create, Discover, My Events, card, pin, join, decline, approve, live color, and reduced motion.
- [ ] Native map on a simulator. Reviewed in code and unit tests only. No simulator was available.
- [ ] MSW inside the static web export. The worker throws on startup. The walkthrough fulfilled the same demo contract beside the export.
- [ ] Browser session against the real API. No identity provider is configured.

## Notes

ADR 0005 stays Proposed. The draft had selected Auth0; that edit was removed. Unlisted events stay off every map, including the owner's. Attendee names, the 24-hour duration proposal, incident tags, and livestream links were not decided.
