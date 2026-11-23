# Grok handoff — Happengo

**Read this file first when continuing work in this repository.** It points to the current product description, feature inventory, and engineering handoff so product intent is not lost between sessions.

## Read in this order

1. [`docs/business/product-description.md`](docs/business/product-description.md) — concise business description and the three connected use cases.
2. [`docs/business/feature-catalog.md`](docs/business/feature-catalog.md) — page-by-page feature definitions, Base44 screenshot/source evidence, and rebuild status.
3. [`docs/product-features.md`](docs/product-features.md) — detailed requirements and unresolved product decisions.
4. [`docs/product-vision.md`](docs/product-vision.md) — product direction and rationale.
5. [`docs/handoff/grok-next-session.md`](docs/handoff/grok-next-session.md) — current implementation, validation status, risks, and next engineering work.

## Next implementation checkpoint

The first-use event journey was validated on 2026-11-23. Create, Discover, My Events, marker and card navigation, join, and owner approve/decline work against the demo contract. The live aura uses the half-open window `startAt <= now < endAt`. Exact commands and what was executed versus only read are in [`docs/handoff/grok-next-session.md`](docs/handoff/grok-next-session.md).

The next small slice should be Discover filters for the existing tags and happening-now. Do not start incident tags, attendee names, a duration change, or livestream links. Those decisions are still open.

## Current product direction

Happengo is one location-based app for local incident awareness, public event discovery, and private gathering memories. Keep these uses together in a shared map/list experience with filters and type-appropriate details and permissions.

For scheduled events, the existing predefined tag chips are the type choices: the first tag selected is the main type and determines pin color; additional selected tags add detail. A separate, subtle pulsing aura marks a pin only while its event is happening (`startAt <= now < endAt`). The event has ended at exactly `endAt`. Do not add a separate event-type field for this behavior.

## Important working rules

- Treat owner messages in the active conversation as current product direction. Treat old chat and Base44 source as evidence, not authority to change privacy.
- A file or component in the Base44 ZIP does not prove a working flow or server-side security. The saved Base44 AI's “fixed” statements also are not validation.
- All 15 shared screenshots have been visually reviewed. A known screenshot discrepancy is that some past-event cards display raw coordinates instead of human-readable addresses.
- Preserve current user work. Do not reset or clean the repository.
- Do not deploy, provision Azure, apply Terraform, or spend money; these actions are not authorized.

## Decisions still open

- Unlisted-event map visibility: **decided**. Brenner confirmed ADR 0007. Unlisted events are never on any map, including the owner's. A share link creates no persisted grant and no attendance. There is no `invited` attendance status.
- Attendee identity display: earlier count-only privacy request conflicts with later requests to show attending friends/people.
- Maximum event duration: 24 hours proposed for initial release versus 7 days in Base44 and rebuild.
- Which predefined tags incident reports need, such as Fire or Traffic Collision.
- Incident verification, freshness, correction, expiry, and moderation rules.
- Whether livestream links belong on incidents, scheduled events, or both.

Do not silently decide these. For other implementation details, make reasonable choices, deliver a small demonstrable feature slice, and report what was validated.
