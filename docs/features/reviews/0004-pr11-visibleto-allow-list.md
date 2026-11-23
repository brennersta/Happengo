# 0004. Review of PR #11, VisibleTo owner allow-list

- Pull request: https://github.com/brennersta/Happengo/pull/11
- Merge commit: `b2d2e1a`
- Branch: `cursor/visibleto-security-08a3` (squash-merged; delete the remote branch once this note is on main)

## Areas

`VisibleTo` owner allow-list, share-token hashing (`HashShareTokens` / pgcrypto), map and share-link rate limits that return 429 as ProblemDetails, production configuration checks, and `AddHappengo(IConfiguration, IHostEnvironment)`.

## Checklist

- [x] Unlisted events stay off every map, including the owner's. The owner allow-list is positive: a new visibility stays hidden until it is listed.
- [x] Share tokens are stored as SHA-256 only. Event reads do not return `shareToken`.
- [x] A share link still creates no attendance row and no map grant. There is no `invited` attendance status.
- [x] Map and share reads are rate limited. Rejection is HTTP 429 with ProblemDetails.
- [x] `AddHappengo` takes `IHostEnvironment` and checks production configuration before the host listens.
- [x] Merged migrations stay immutable. `HashShareTokens` is a new migration; `Initial` is unchanged.
- [ ] Azure `azure.extensions` must allow `PGCRYPTO` next to `POSTGIS` before that migration can run in Azure. The Terraform allow-list change is in the first-event-journey PR and has not been applied.

## Notes

This review records the squash that landed on main while the first event journey was in progress. The journey branch merged `b2d2e1a` and kept this behavior where the unvalidated draft disagreed, including the half-open end instant (`start_at <= now < end_at`).
