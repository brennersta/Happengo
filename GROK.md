# Grok handoff — Happengo

**Read this file first when continuing work in this repository.** It points to the current product description, feature inventory, and engineering handoff so product intent is not lost between sessions.

## Read in this order

1. [`docs/business/product-description.md`](docs/business/product-description.md) — concise business description and the three connected use cases.
2. [`docs/business/feature-catalog.md`](docs/business/feature-catalog.md) — page-by-page feature definitions, Base44 screenshot/source evidence, and rebuild status.
3. [`docs/product-features.md`](docs/product-features.md) — detailed requirements and unresolved product decisions.
4. [`docs/product-vision.md`](docs/product-vision.md) — product direction and rationale.
5. [`docs/handoff/grok-next-session.md`](docs/handoff/grok-next-session.md) — current implementation, validation status, risks, and next engineering work.

## Next implementation checkpoint

Azure MVP hosting is prepared on `codex/azure-mvp-hosting`. See [review 0028](docs/features/reviews/0028-azure-mvp-hosting.md) and the [setup guide](docs/operations/azure-setup.md). Azure resources have not been deployed.

The first-use event journey was validated on 2026-11-23. Create, Discover, My Events, marker and card navigation, join, and owner approve/decline work against the demo contract. The live aura uses the half-open window `startAt <= now < endAt`. Exact commands and what was executed versus only read are in [`docs/handoff/grok-next-session.md`](docs/handoff/grok-next-session.md).

The public demo is live at `https://brennersta.github.io/Happengo/` when GitHub Pages Source is GitHub Actions. The current slice matches the target Discover, detail, create, and My Events layout and adds Photon address search (ADR 0010). Do not start cover upload, albums, reactions, incident tags, attendee names, a duration change, or livestream links.

Incidents v1 is now in the app and API. The map-picker and pin-preview corrections landed in PR #39; read the `Map and incident UX follow-up (2026-11-25)` section in [`docs/handoff/grok-next-session.md`](docs/handoff/grok-next-session.md) and review note 0024. Incident photos remain explicitly out of v1 per ADR 0012. Event albums and reactions are separate, still-missing rebuild features; the Base44 event-detail screenshot is evidence of that gap, not evidence those features exist in this API.

The event detail visual alignment was merged to main in PR #40; read the `Event detail visual alignment (2026-11-25)` handoff section and review note 0025. It aligns the content width, card padding, title hierarchy, and fact spacing to the reviewed Base44 screenshot. It does not add cover upload, reactions, or albums. The pin-click follow-up is recorded in review note 0026. PR #42 groups the Discover Create menu and event form control improvements on `codex/create-expand-menu`; read review note 0027 and the `Expand Create options on Discover (2026-11-25)` section of the handoff before continuing.

Auth0 is the identity provider (ADR 0005, chosen 2026-11-23). Entra External ID was considered and was not selected. No tenant has been created.

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
