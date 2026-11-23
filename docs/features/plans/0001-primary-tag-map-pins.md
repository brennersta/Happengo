# Feature plan 0001: Primary-tag map pins and live-event aura

**Status:** Implementation drafted; validation pending  
**Priority:** Next bounded vertical slice  
**Owner decision recorded:** The first event tag selected is its main type. Additional selected tags are descriptors. No separate `type` field or second taxonomy step is wanted for this feature.

## User outcome

When someone creates an event and sees it on the map, they can recognize its main type from the pin color. If the event is happening at that moment, a separate subtle pulsing aura shows that it is live.

## Current rebuild evidence

- `backend/src/Happengo.Api/Events/EventTag.cs` defines the current fixed tag vocabulary: Music, Sports, Food, Art, Family, Tech, Nightlife, Outdoor, Culture, Education.
- The event entity stores `Tags`; `CreateEventRequest` accepts tags; creation validation checks the supported vocabulary; `EventResponse` returns tags. Backend support exists, but its end-to-end order preservation has not been established in this review.
- `EventMapping.ToResponse` currently calculates `HappeningNow` as `startAt <= now && now < endAt`. The accepted owner rule for the visual aura is inclusive at the end (`startAt <= now && now <= endAt`), so align the API/client live-state boundary in this slice.
- `apps/mobile/src/app/events/create.tsx` currently has no tag state or tag selector and sends no tags in the create request.
- `apps/mobile/src/map/types.ts` currently gives `MapMarker` only an ID, coordinate, and title. Web and native map components render the same fixed purple marker.
- The rebuild map components do not currently receive a live-state flag or render an aura.
- The Base44 export uses `tags[0]` for a category outline and separately pulses a ring when `startAt <= now <= endAt`; its pin face remains purple. The target below makes the main tag determine the pin color and keeps the live aura separate.
- The published Base44 app at [happen-go.base44.app](https://happen-go.base44.app) could not be opened from this workspace. The saved screenshots and ZIP source were reviewed; the live app was not runtime-validated.

## Scope

1. Add the existing supported tag chips to the event create form.
2. Require at least one tag for a newly created event, because each event needs a main type.
3. Use selection order: the first selected tag is the main type; remaining selected tags are additional descriptors. If the main tag is deselected, the next still-selected tag becomes main. Keep the order when submitting, storing, returning, and rendering the event.
4. Give each supported main tag a stable, distinct pin color. Use one shared mapping for web and native. The pin face uses this color; do not show all tags as separate colors on one pin.
5. Compute live state from the event's absolute start/end instants: `startAt <= now && now <= endAt`.
6. Render a separate subtle pulsing aura only for live events. The aura must not replace or obscure the main-tag pin color.
7. Use a neutral fallback for legacy or demo events with no tags so old records still render. Do not let untagged records break the map.

Out of scope: adding new incident-specific tags; changing visibility, attendance, date duration, or privacy rules; tag filtering UI; marker clustering redesign; changing map tile provider; adding a separate primary-type database field.

## Acceptance criteria

### Create and persist tags

- [x] Create Event shows the existing predefined tag choices in a multi-select control.
- [x] A user cannot submit a newly created event without choosing at least one tag. The UI explains the validation error next to the tag control; API validation also rejects an empty list.
- [x] A visible cue identifies the first selected tag as “Main type” (localized in English and Brazilian Portuguese).
- [ ] Selecting more tags does not change the main tag. Deselecting the main tag promotes the earliest remaining selected tag.
- [ ] Selection order is preserved in the request, server model/database, event response, and client event model. Add or adjust tests at the boundary where order might otherwise be lost.
- [ ] Existing event creation requirements and validation continue to work.

### Map pins

- [x] The first tag maps deterministically to one color. Every currently supported tag has an explicit color; colors are consistent on web and native.
- [ ] An event with Music as its first selected tag uses the Music color even if another tag follows. Changing selection order changes the main tag and pin color accordingly.
- [ ] The selected main-tag color is visible on the pin itself. Secondary tags do not alter pin color.
- [x] Events with no tags use the documented neutral fallback and do not crash or disappear.
- [x] Marker accessibility labels identify the event and include its main type and live state.

### Live-event aura

- [ ] At `now < startAt`, the pin has no pulse.
- [x] For `startAt <= now <= endAt`, a separate, subtle aura pulses around the pin while the main-tag color remains visible. The exact end instant is included, matching the owner's stated definition.
- [ ] At `now > endAt`, the pin has no pulse.
- [ ] API/event detail and both platform maps agree on the live-state rule; update the existing `HappeningNow` mapping/tests if needed.
- [ ] Web and native use the same time rule and visually equivalent states. Do not confuse an upcoming event with a live one.
- [x] Where reduced-motion preferences are available, respect them by showing a static live ring instead of animating.

### Verification and handoff

- [ ] Review/update existing focused tests for tag selection order/main-tag selection, stable tag-to-color mapping, and the three live-state time boundaries. Do not treat source edits as passing tests.
- [ ] Run relevant workspace tests, typecheck, lint, and web export. Record the actual results; a successful build is not a manual UX walkthrough.
- [ ] If the local browser becomes available, manually create one tagged demo event, confirm the marker color, and check upcoming/live/ended states. If the Base44 live app remains unreachable, state that clearly and do not imply it was inspected.
- [ ] Do not deploy or apply infrastructure as part of this slice.

## Implementation notes

- Prefer carrying `mainTag` as a derived value from the ordered `tags` array rather than creating a second persisted source of truth.
- Ensure the client preserves selection order; do not sort selected tags by enum/list order before sending.
- Define the tag-to-color map once in shared client code and pass `color` and `isHappeningNow` (or equivalent presentation props) to both platform map implementations.
- Keep tag-chip presentation aligned with the main-tag color if that can be done without a broad visual redesign.
- A legacy event with an empty tag list has no main tag. Use the neutral fallback; do not infer a tag.
- Keep pulse styling restrained and distinct from type color. Avoid marker content/layout shifts that make the pin harder to tap.

## Completion note template

When finished, update the Grok handoff with:

- Files and behaviors changed.
- Which acceptance checks passed and the exact commands/results.
- Whether web and native rendering were manually viewed or only compiled.
- Any unresolved issue, especially if tag order did not survive the full create/read path.

## Work completed in Codex on 2026-11-20 (not yet validated)

- Added ordered tag selection to the mobile Create Event form. The first selected chip is marked as the main type; deselecting it promotes the next selected chip. English and Brazilian Portuguese labels and the required-tag error were added.
- Added a required non-empty tags rule to the create API request and validator, and updated the OpenAPI JSON and generated client request type. Existing validator code keeps the original order after duplicate removal; PostgreSQL stores the array in order.
- Added one shared explicit color mapping and neutral fallback. Discover now passes the first tag and live state to the web/native map pins.
- Web pins use the main-tag color and animate a separate aura for live events, respecting browser reduced-motion preference. Native pins do the same and show a static ring when reduced motion is enabled.
- Client Discover recalculates live marker state every 30 seconds so a future event can start pulsing without a new API request and an ended event stops pulsing.
- API response and mock live-state calculations use inclusive bounds. Map visibility includes an event at its exact end instant and excludes it immediately afterward, matching the live indicator. Existing test fixtures/assertions were adjusted for this boundary; no tests were run in this session.
- API client generation was completed directly with `node ./scripts/generate.mjs` from `packages/api-client` (openapi-typescript 7.13.0). `pnpm api:generate` could not start because pnpm attempted an automatic workspace install and Windows denied creation of a symlink in its package store (`EPERM`).
- Validation remains outstanding: typecheck, relevant unit/API checks, web export, and a manual web/native visual walkthrough. The existing criteria above are implementation status, not proof of runtime behavior.
