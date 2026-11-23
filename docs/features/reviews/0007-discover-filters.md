# 0007. Review of Discover filters

- Pull request: https://github.com/brennersta/Happengo/pull/17
- Branch: `cursor/discover-filters-c78e`

## Areas

Discover tag chips and the happening-now toggle, `GET /v1/events` query `happeningNow`, the OpenAPI document and generated client, and the demo fetch mock plus MSW handler.

## Checklist

- [x] Tag filter keeps events that have any selected predefined tag. Unknown tags still return 400.
- [x] Happening now uses `start_at <= now < end_at`. An event at exactly `end_at` is not included.
- [x] `VisibleTo` remains the privacy filter. An unlisted live event is absent from the map when the toggle is on.
- [x] Apply and Clear all are explicit. The demo mock applies the same query flags, so the Pages demo can filter without a server change beyond the API contract.
- [x] `dotnet test` 210 passed, including PostGIS. Mobile tests 51 passed. Client generation makes no diff.
- [ ] The filter controls were not clicked in a browser during this slice. The live Pages check for the previous demo was a separate run.
