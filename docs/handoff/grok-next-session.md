# Happengo handoff for Grok

Updated: 2026-11-20

## Purpose

Continue the Base44-to-owned-code rebuild in small, reviewable slices. This is a status and backlog note, not authorization to deploy or spend money. Azure infrastructure has not been applied and remains unauthorized.

## Product direction from owner (2026-11-18)

Read the plain-language [`business product description`](../business/product-description.md), page-by-page [`feature catalog`](../business/feature-catalog.md), [`product vision`](../product-vision.md), and [`feature requirements and Base44 inventory`](../product-features.md) before reprioritizing. The saved Base44 AI conversation and Base44 ZIP have now been reviewed at source level. The feature brief separates the owner's current target, historical requests and AI claims, what the ZIP contains, and rebuild status. Do not treat old chat text or Base44 client-side checks as authority to alter privacy or as proof of backend enforcement.

The current implementation is mainly a scheduled social-events/map/API foundation, not a full rebuild of the Base44 app or the owner's three use cases. The owner wants incidents, public events, and private gatherings together in one app and map with user-controlled filters. Keep type-aware details/actions. For event creation, the existing predefined tags are the type choices: the first tag selected is the event's main type and determines pin color; any additional tags are descriptors. Do not add a separate type field or second taxonomy step. While an event is live (`startAt <= now <= endAt`), its pin also gets a separate subtle pulsating aura. The old ZIP uses the first tag to color a ring while the pin body remains purple; the target is to color the pin by that tag and keep the live aura separate. Waze is a relevant precedent for quick location-based reports and freshness feedback. Do not tell the owner to restate the product direction or reduce it to parties. Distinguish abuse flags from “still present/not there” feedback, and define provenance, correction, expiry, and moderation before broad incident reporting.

### What the Base44 ZIP contains (source inspection, not runtime validation)

- Entity schemas for Event, Attendance, EventInterest, EventReaction, EventPhoto, Friend, FriendTag, Report, and User.
- MapView uses Leaflet marker clustering, map/list and a FilterPanel; the filter component has tag/date/happening-now controls, Apply, and Clear all. It shows attending counts and friend-attendee UI.
- CreateEvent has date/time, visibility, attendance mode, address/location, friend-tag selection and cover upload. Validation in `eventValidation.jsx` explicitly allows up to 7 days.
- EventDetail has attendance/reaction/interest/photo/report components; Friends/AcceptFriend include invite-link and reciprocal-friend flows; MyEvents reads attended events; PhotoGallery includes upload/delete UI and client-side eligibility checks; ReportModal handles abuse/content reasons.
- Report is a content-moderation report, not an incident-report lifecycle or “still there/not there” feature. The ZIP alone cannot prove hosted backend/storage enforcement, a successful runtime flow, or screenshot parity.
- ZIP inventory appears to be source and schemas, not user/event/photo records. If existing records matter, obtain a separate Base44 data export plan.
- All 15 PNGs in the shared Photos folder have now been visually reviewed. They confirm the map/list, filters, creation, detail, album, My Events, Friends, Profile, and address-search screens described in the feature catalog. `my_events_list_past.png` shows raw coordinates on several past-event cards where a human-readable address should appear.

### Base44 AI conversation review

`HappengoChat/Untitled-1.md` is the saved Base44 AI conversation (it contains both owner prompts and replies labeled “Resposta da Base44”). The separate `GPT Chat/Build Flutter PoC` file is a ChatGPT chat, not Base44 history. The transcript contains additional feature requests now recorded in the product brief: owner event edit/delete, Interested separate from attendance, attendee cancellation, aggregate post-start reactions without comments, photo/profile uploads, EN/PT-BR, admin-only event/photo reports, and mobile/map usability acceptance criteria.

Base44 AI repeatedly claimed changes were fixed or “production-ready,” but later owner replies documented unresolved mobile map/list mismatch and counts, overlapping or unclickable same-location pins, address search placement/visibility, and event creation being triggered by date selection or multi-day dates saving incorrectly. The owner also reported that the map still failed after the AI said lint/build passed. Treat the AI's completion statements as unverified claims. These reported defects justify emphasizing user-flow validation and stable map interaction in the rebuild; do not assume those specific Base44 bugs exist in the new implementation without checking.

The transcript's São Geraldo episode is a concrete warning about seeded data and map truth: AI first attributed missing events to a Helsinki fallback, the owner then clarified that the desired neighborhood still had no events visible, and duplicate-coordinate marker previews remained broken through multiple claimed fixes. If Grok adds demo data, verify its coordinates and visibly test the intended viewport and pin selection. The transcript also says the hosted app needed republishing for unpublished changes to appear; source edits/build status and the currently published app were not necessarily the same revision.

### Conflicts to resolve before changing behavior

- **Unlisted map visibility:** saved chat contains a later “FINAL” rule where owner/invitees/share-link audience can see unlisted events on the map. Accepted rebuild ADR 0007 says unlisted events never appear on the map, including for owner. The current owner message only reaffirmed private events must be hidden from outsiders. Ask the owner to reconcile before changing server privacy.
- **Attendee identities:** older history explicitly says count-only/no public attendee names or avatars, with friend count for signed-in viewer. The owner's newer 2026-11-18 message says public events can “show who is attending.” Current ADR 0007 allows a count plus up to three friends' avatars. Confirm intended audience/display before exposing identities.
- **Duration:** current owner proposed 24 hours for initial release; old chat, Base44 validator, and rebuild allow 7 days. Align only after decision.
- **Incident tags:** existing event tags already include Music, Sports, Food, Art, Family, Tech, Nightlife, Outdoor, Culture, and Education. Decide whether the shared predefined list needs incident-specific choices such as Fire or Traffic Collision.

The detailed requirements and evidence are in [`docs/product-features.md`](../product-features.md). Do not silently choose a side in these conflicts.

## Next bounded feature: primary-tag map pins and live aura

Implement [`feature plan 0001`](../features/plans/0001-primary-tag-map-pins.md) before starting a broader product area. The owner clarified that the first selected existing tag is already the event's main type; additional selected tags are descriptors. Do not add a separate type field or a second selection step.

The API has a fixed EventTag vocabulary and carries tags, but the rebuild create screen currently sends none. Both rebuild map renderers currently use a fixed purple pin and have no live aura. Complete the create-to-map path: add tag selection, require one tag for new events, preserve selection order end to end, map the first tag to a stable color shared by web/native, and show a separate subtle pulse exactly while `startAt <= now <= endAt`. The detailed acceptance criteria, legacy fallback, accessibility, tests, and verification expectations are in the feature plan.

The live Base44 URL could not be opened from this workspace. Do not state that the live app was inspected; use the saved screenshots and ZIP source as historical evidence and record what was actually validated in the rebuild.

## Repository and source material

- Rebuild repository: `C:\Projects\Happengo`
- Base44 code export: `C:\Users\SilvaBrenner\Downloads\happen-go-main.zip`
- Published Base44 app URL from the saved Base44 conversation: https://happen-go.base44.app (not reachable from this workspace during review; Grok may have a working browser/network path).
- Original screenshots and saved chat history: `C:\Users\SilvaBrenner\OneDrive - Riverty Group GmbH\Desktop\Happengo`
- Baseline commit before current work: `69e1fd5` (`Scaffold the Expo client and proposed map ADR (#6)`). All work described below is uncommitted. Inspect and preserve it; do not reset/clean.

## Implemented

### Foundation

- Expo/React Native app for web/iOS/Android, ASP.NET Core 10 API, PostgreSQL/PostGIS, Terraform layout, ADRs, migrations, privacy/read tests, and CI validation.
- API read routes: viewport, direct event, and live unlisted event by share token.
- Server-side event visibility enforcement.

### Discover

- Fetches `GET /v1/events` for the current map viewport and renders the same results as map pins and a list.
- Loading, empty, error/retry, count, truncated-result and EN/PT-BR copy.
- Web MapLibre markers/popups; native MapLibre `Marker` pins; both report idle viewport bounds. Bbox coordinates are clamped and rounded.
- Mock fixtures are clock-relative. Tests cover bbox/date helpers and localized count plurals.
- Event rows open a detail screen. The map header has a create-event action.

### Client create and detail flow

- Added a create-event screen with title/description, local date and time fields, device IANA time zone, address, visibility, join approval mode, and map-tap location selection.
- Client validation mirrors backend constraints: required/maximum field lengths, valid local date/time, start in the future, end after start and in the future, maximum seven-day duration, valid time zone and coordinates.
- Successful create invalidates Discover queries and navigates to the new event detail route. Detail reads use `GET /v1/events/{id}` and show the map pin, event time, address, description, visibility and attendee count.
- Auth0 is the selected identity provider (ADR 0005 accepted). In production/no-mock mode, event creation stops with a sign-in-required message until Auth0 issuer/client/resource configuration is filled and verified rather than pretending to authenticate.
- Development mock mode now supports in-memory create, detail read and Discover refresh. The create screen clearly labels these events as temporary. Mock events are not persisted or sent to the real API; real creation remains unavailable until Auth0 configuration and live authentication are verified.
- Required request DTO values stay nullable internally so missing JSON fields reach the validator and produce 400. `[Required]` metadata plus the OpenAPI transformer mark them required and non-nullable in the API contract/client types.

### Authentication groundwork

- Added Expo AuthSession and Crypto, with a provider-neutral OIDC authorization-code + PKCE sign-in button and issuer discovery. No client secret is embedded in the app.
- The token manager keeps access tokens in memory, refreshes near expiry, serializes concurrent refreshes, and stores native refresh tokens in SecureStore. The web refresh-token store remains memory-only; refresh tokens are never written to `localStorage`.
- Sign-in controls are available from Profile, and the create screen links to sign-in when the API requires authentication. The app exposes web/native client ID and redirect URI config plus API scope/audience settings.
- OIDC configuration is blank in `apps/mobile/.env.example`. No Auth0 tenant, app registration, redirect allowlist, API resource/audience, or social connections have been configured. Live login/refresh has not been tested. The client requires an API audience before enabling sign-in because API access tokens must target the configured backend audience.
- The owner explicitly selected Auth0 for the easier $0 initial-project path. ADR 0005 is Accepted. Auth0's listed free tier covers up to 25,000 MAU; Entra External ID remains a possible future alternative for Azure alignment and its larger core free tier. Do not describe provider selection as pending. See `docs/authentication-setup.md`.

### Event creation API

- Authenticated, rate-limited `POST /v1/events`.
- Validates required fields, IANA time zone, strict no-past start/end, end after start, duration <= 7 days, coordinate ranges, supported tags and field lengths.
- Creates the event and owner `attending` row in one EF save. Server generates event ID/share token and returns owner detail.
- Attendance internals stay behind the public `AttendanceAccess` feature seam; a test initially caught and the implementation fixed a cross-feature boundary violation.
- `api/openapi.json` and generated TypeScript client reflect the operation and required fields.
- The API client generator now starts `openapi-typescript` through the current Node executable instead of spawning `pnpm` directly. This avoids a Windows `spawnSync pnpm ENOENT` failure when running the workspace scripts.

### Attendance lifecycle API and event detail actions (2026-11-17)

- Added authenticated attendance routes under `/v1/events/{eventId}/attendance`: `GET me`, `GET requests`, `POST` request/join, `POST requests/{userId}/approve`, `POST requests/{userId}/reject`, and `POST cancel`.
- Join policy: public events allow attendance; `approvalMode=open` immediately records `attending`, while `approval` creates `requested`. Friends-only events require an existing invite. Unlisted events require the share token in the join request. Event owners cannot join again. Ended events reject new attendance and owner decisions. Hidden/ineligible events return 404 to avoid revealing their existence.
- Owners can list pending requester user IDs and approve/reject requests; identities remain private from other attendees. Current UI shows the first 8 characters of each user ID because display-name/profile retrieval is not implemented yet.
- Attendees can cancel their own `attending` row. Rejected and cancelled rows cannot be reopened; this is the conservative implementation while ADR 0003's rejoin policy remains open. Confirm desired rejoin behavior before relaxing this rule.
- Statuses serialize as lowercase strings (`attending`, `requested`, `rejected`, `cancelled`). `AttendanceAccess` and `EventAccess` expose public feature contracts so Attendance does not depend on Events' internal entity. Architecture-boundary tests caught and drove the correction of an initial direct Event query.
- Event detail now requests the signed-in user's attendance state, offers join/request/cancel controls, and shows owner pending requests with approve/reject actions. Development mocks implement public-event join/cancel and in-memory status/count updates; approval queues cannot be populated from the single-user mock identity, so validate approval in API integration tests until a richer demo identity flow exists.
- Regenerated `api/openapi.json` and `packages/api-client/src/generated/schema.ts` from the current API.

## Verified checks

- Backend solution build: passed, 0 warnings/errors.
- Full backend suite before attendance additions: **181 passed, 0 failed**, including Docker/PostGIS integration tests. Focused create-event integration tests: **4 passed**, including an omitted-required-fields request returning 400.
- OpenAPI drift tests: **3 passed** after regeneration from the current API, including required/non-null create-field schema coverage.
- Workspace typecheck: passed for API client and mobile app; generated client compiles against the committed OpenAPI contract.
- Workspace tests: API client generation test **1 passed**; mobile Jest before attendance UI: **36 passed, 0 failed**.
- Mobile lint: passed with Expo telemetry disabled and its state directory redirected into `.tools`.
- After OIDC dependencies were added, Expo web export passed and Android export passed with a 3.5 MB Hermes bundle.
- Current turn: focused Auth0 config/token-manager tests passed (**8 tests**) and workspace typecheck passed after making the Auth0 API audience mandatory.
- Attendance turn: full backend/PostGIS suite passed (**187 passed, 0 failed**); OpenAPI drift tests passed (**3**); frontend Jest passed (**37 passed, 0 failed**); lint and workspace typecheck passed after attendance API/UI integration.
- Web export was started after the latest UI changes but stopped at the owner's request to resume tomorrow; no success/failure result was captured. Re-run `pnpm web:export` before considering this UI build validated.
- Tried the local web UI walkthrough. Metro reported that it started on localhost, but the browser received connection refused/timeouts and local HTTP requests could not connect. A second server attempt also did not accept connections. The Expo web export was retried, but Metro stayed active without completing in this sandbox. Therefore the create-to-detail UI has **not** been manually walked through. The earlier successful web export remains the last confirmed export; a real browser walkthrough remains next.
- `git diff --check`: passed at last check.
- No manual browser or device interaction has been performed. A local web preview started, but Windows Computer Use app approval timed out before UI inspection; no browser actions were taken. Bundling is not a substitute for UX walkthrough.

## Local toolchain

Node.js 22.23.5 and the pinned pnpm 10.34.9 are available in ignored `.tools/`; `pnpm install --frozen-lockfile` completed for 1,186 packages. `.tools/` and `node_modules/` are ignored and should not be committed. In PowerShell, initialize the local tools before invoking package scripts:

```powershell
$nodeDir = (Resolve-Path '.tools\node-v22.23.5-win-x64').Path
$binDir = Join-Path (Get-Location) '.tools\global\node_modules\.bin'
$env:Path = "$binDir;$nodeDir;$env:Path"
$env:COREPACK_HOME = Join-Path (Get-Location) '.tools\corepack'
$env:EXPO_HOME = Join-Path (Get-Location) '.tools\expo-home'
$env:EXPO_NO_TELEMETRY = '1'
& "$binDir\pnpm.cmd" --version # expected: 10.34.9
```

`node_modules/` is already installed. In this Codex sandbox, testhost and Docker access required approved elevated execution; integration tests pass with that access.

## Remaining product and engineering work

- OIDC client code is present, but sign-in stays disabled until Auth0 issuer, client IDs, API audience, and exact callback allowlists are supplied. ADR 0005 records Auth0 as Accepted.
- Auth0 is the owner's choice. Tenant/app/API configuration and callback allowlists remain pending. Do not represent them as configured or fabricate credentials.
- Real authenticated event creation cannot be demonstrated until provider configuration exists and live auth passes on a development build. Development mocks demonstrate the event UI flow only.
- Discover has no filters yet.
- My Events, Friends, Profile remain placeholders.
- API now supports attendance join/request, owner approval/rejection, cancellation and own-status reads. It still lacks event edit/delete, friends/invite lifecycle/tags, albums/media/report routes, and profile updates.
- Azure PostgreSQL configuration still has a deployment gap: Terraform passes separate PostgreSQL host/database/user and managed identity settings, but the API requires `ConnectionStrings:Happengo` and no token acquisition/refresh path was found. Fix and test before any deployment.
- Data export/import from Base44 is unplanned; the ZIP appears to be code/entities, not user/event/photo records.
- No Azure plan/apply, provisioning, or spend is authorized.

## Next steps for Grok

1. Validate the current first-use event journey. Codex drafted feature plan 0001 plus My Events and marker-to-detail navigation on 2026-11-20. Read the newest work note below. No tests, typecheck, build, or visual walkthrough were run. Fix compile/runtime issues, then record exact commands/results. Confirm OpenAPI/client output matches backend annotations, tags preserve order, and `/v1/events/mine` returns only the caller's owned/attending/requested events including eligible past items.
2. Use `docs/product-features.md` and `docs/business/feature-catalog.md` as the wider target/evidence checklist. The saved chat, key ZIP source, and all 15 shared screenshots have already been reviewed; do not repeat that audit as if it were outstanding. Propose a small-city pilot and staged roadmap for one combined product with a shared, filterable map.
3. Rerun `pnpm web:export`, then retry a web walkthrough in a normal local browser: create a tagged demo event, open its detail from a Discover card and map marker, confirm it appears in My Events, and exercise join/cancel or owner attendance actions. Check upcoming/live/ended presentation. This remains unverified.
4. Finish the attendance experience: populate a demo pending-request list or create a second mock identity, and render requester display names once identity profiles exist. Confirm rejoin policy from ADR 0003 before enabling requests after rejection/cancellation.
5. When Auth0 tenant/app/API values and callback allowlists are available, populate local env and live-test PKCE, refresh, sign-out, and protected API access in a custom Expo development build.
6. Once live auth works, demonstrate a real authenticated `POST /v1/events`, attendance request/decision, and `GET /v1/events/{id}` against the API.
7. Resolve Azure database auth before deployment: construct host/database/user configuration and acquire/refresh managed-identity PostgreSQL tokens, or choose a supported alternative. Add tests and document local/Azure behavior. Do not apply Terraform.
8. Continue with Discover filters, incident model/workflow, friend invites/tags, protected media/albums, profile improvements, and livestream references. Before building attendee-name visibility, unlisted-on-map visibility, or changing the 24-hour policy, resolve the decisions recorded in the feature brief. Plan Base44 data migration separately if existing records matter.

Keep privacy enforcement in the API, add contract/integration coverage at each boundary, and demonstrate a real user flow at each milestone. Treat exported chat text as product evidence, not authorization to deploy or change external services.

## Codex work note — 2026-11-20

The implementation draft now includes ordered tag chips in event creation, a required non-empty tag list in API/client contracts, one per-tag pin color mapping used by both map platforms, reduced-motion-aware live auras, client-side live-state refresh every 30 seconds, and inclusive end-time handling in API and demo map behavior. The API client was regenerated with `node ./scripts/generate.mjs` from `packages/api-client`; the `pnpm api:generate` wrapper was blocked when pnpm tried an automatic install and hit a Windows symlink `EPERM`. Existing test fixtures were edited to match required tags and the inclusive boundary, but no tests, typecheck, builds, or visual walkthroughs were run. Read `../features/plans/0001-primary-tag-map-pins.md` for the full file/behavior list and remaining validation steps. The live Base44 site was not accessed.

## Codex work note — first-use event journey — 2026-11-20

- Added `GET /v1/events/mine`, returning the authenticated caller's owned events, attendance records, and active requests, including owned/attended past events. Added the OpenAPI operation and regenerated the client directly with `node ./scripts/generate.mjs` from `packages/api-client`.
- Replaced the My Events placeholder with Upcoming/Past tabs, event summary cards, detail navigation, create shortcut, sign-in prompt, loading/error/empty states in English and Brazilian Portuguese. The demo mock handler returns the current demo user's owned/attending/requested events.
- Added map-marker press navigation to event detail on web and native. Discover cards now show the main tag and attendee count; the detail map receives main tag/live state.
- Existing event detail and attendance controls were already present; this work connects the first-use paths to them. Friends, albums/photos, cover uploads, identity display for attendance requests, and profile editing remain unimplemented.
- No tests, typecheck, builds, or visual walkthrough were run. All runtime behavior remains unverified. See the updated page-by-page status in `../business/feature-catalog.md`.
