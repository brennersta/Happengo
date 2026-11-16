# 0006. Geo queries

- Status: Accepted
- Date: 2026-11-16

## Context

Discover is the map, and the list shows the same events as the current view. The old client downloaded events and filtered them in the browser. Tiles do not wrap the world. People search by address and drop a pin that must become a street address. Clustering and pins that share a coordinate were a long-running client bug. The filter panel has no radius slider. Discovery is the viewport. A radius query is for a point and a distance.

## Decision

Viewport search:

`GET /v1/events?bbox=minLng,minLat,maxLng,maxLat`

The query applies `VisibleTo` ([ADR 0007](0007-privacy-enforcement.md)), requires `now < end_at`, and keeps points that satisfy `location && ST_MakeEnvelope(minLng, minLat, maxLng, maxLat, 4326)`. `location` is `geometry(Point,4326)` with a GiST index ([ADR 0003](0003-data-model.md)). `&&` includes the envelope boundary. The response is capped at about 500 events.

Tiles do not wrap, so a viewport that crosses the antimeridian is outside the product. The query does not split the box.

A radius search, when one is needed, casts the point to `geography` and uses `ST_DWithin`. That path has its own GiST index on the geography expression.

Clustering and same-location handling are client-side in MapLibre. The API returns points.

The viewport payload includes the point so the map can place a pin. Screens show `address`, not a raw coordinate string.

Address autocomplete and reverse geocoding go through one provider, behind a single adapter. The adapter may live in the API or in the client. The provider is open.

MapLibre's tile provider is open.

## Consequences

- Map and list share this query, so pan, zoom, and filters cannot diverge.
- The cap can truncate a dense city. The response says when it was truncated.
- The geography cast needs its own GiST index. The geometry index does not serve `ST_DWithin`.
- Feature code calls the geocoding adapter. Vendor URLs stay inside that adapter.

## Open

- Geocoding provider, and whether the adapter is server-side or client-side.
- Tile provider.
- Map center when the user denies location. The old app used two different fallback cities. No default is chosen here.
