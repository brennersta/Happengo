# Happengo handoff for Grok

Updated: 2026-11-23

## Correction before the 2026-11-20 notes

The notes below were written with the unvalidated Codex draft and are not the current rules where they disagree with this section.

- Happening now is half-open: `startAt <= now < endAt`. The event has ended at exactly `endAt`. Map visibility uses the same end (`now < endAt`). The draft's `<= endAt` was wrong and has been removed from the API, the demo mock, and both map clients.
- Unlisted events are never on any map, including the owner's. Brenner confirmed ADR 0007. A share link creates no persisted grant and no attendance. There is no `invited` status. This is no longer an open product decision.
- The identity provider is Auth0. Brenner chose it on 2026-11-23. ADR 0005 is Accepted. Entra External ID remains the considered alternative. No tenant or secret exists. The client sends the OIDC `audience` parameter because that is what Auth0 requires.
- Share tokens are stored as SHA-256 only (PR #11). Reads, including create, do not return `shareToken`. Create stores the hash and discards the plaintext, so the owner cannot yet show a share link. Returning the plaintext once belongs with event edit, which is not in this slice.
- Attendee identity display, maximum duration (24 hours vs 7 days), incident tags and moderation, and livestream links stay open. Current behavior is unchanged: 7-day cap, count plus the existing request-id prefix, no incident tags, no livestream field.

Validation commands and results for 2026-11-23 are in the section at the end of this file. That section is the source of truth for what was executed.

Updated: 2026-11-20

## Purpose

Continue the Base44-to-owned-code rebuild in small, reviewable slices. This is a status and backlog note, not authorization to deploy or spend money. Azure infrastructure has not been applied and remains unauthorized.

## Product direction from owner (2026-11-18)

Read the plain-language [`business product description`](../business/product-description.md), page-by-page [`feature catalog`](../business/feature-catalog.md), [`product vision`](../product-vision.md), and [`feature requirements and Base44 inventory`](../product-features.md) before reprioritizing. The saved Base44 AI conversation and Base44 ZIP have now been reviewed at source level. The feature brief separates the owner's current target, historical requests and AI claims, what the ZIP contains, and rebuild status. Do not treat old chat text or Base44 client-side checks as authority to alter privacy or as proof of backend enforcement.

The current implementation is mainly a scheduled social-events/map/API foundation, not a full rebuild of the Base44 app or the owner's three use cases. The owner wants incidents, public events, and private gatherings together in one app and map with user-controlled filters. Keep type-aware details/actions. For event creation, the existing predefined tags are the type choices: the first tag selected is the event's main type and determines pin color; any additional tags are descriptors. Do not add a separate type field or second taxonomy step. While an event is live (`startAt <= now < endAt`; ended at exactly `endAt`), its pin also gets a separate subtle pulsating aura. The old ZIP uses the first tag to color a ring while the pin body remains purple; the target is to color the pin by that tag and keep the live aura separate. Waze is a relevant precedent for quick location-based reports and freshness feedback. Do not tell the owner to restate the product direction or reduce it to parties. Distinguish abuse flags from “still present/not there” feedback, and define provenance, correction, expiry, and moderation before broad incident reporting.

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

The API has a fixed EventTag vocabulary and carries tags, but the rebuild create screen currently sends none. Both rebuild map renderers currently use a fixed purple pin and have no live aura. Complete the create-to-map path: add tag selection, require one tag for new events, preserve selection order end to end, map the first tag to a stable color shared by web/native, and show a separate subtle pulse exactly while `startAt <= now < endAt`. The detailed acceptance criteria, legacy fallback, accessibility, tests, and verification expectations are in the feature plan.

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
- The identity provider is not selected. ADR 0005 is Proposed. In production/no-mock mode, event creation stops with a sign-in-required message until issuer, client, and API audience configuration is filled and verified rather than pretending to authenticate.
- Development mock mode now supports in-memory create, detail read and Discover refresh. The create screen clearly labels these events as temporary. Mock events are not persisted or sent to the real API; real creation remains unavailable until Auth0 configuration and live authentication are verified.
- Required request DTO values stay nullable internally so missing JSON fields reach the validator and produce 400. `[Required]` metadata plus the OpenAPI transformer mark them required and non-nullable in the API contract/client types.

### Authentication groundwork

- Added Expo AuthSession and Crypto, with a provider-neutral OIDC authorization-code + PKCE sign-in button and issuer discovery. No client secret is embedded in the app.
- The token manager keeps access tokens in memory, refreshes near expiry, serializes concurrent refreshes, and stores native refresh tokens in SecureStore. The web refresh-token store remains memory-only; refresh tokens are never written to `localStorage`.
- Sign-in controls are available from Profile, and the create screen links to sign-in when the API requires authentication. The app exposes web/native client ID and redirect URI config plus API scope/audience settings.
- OIDC configuration is blank in `apps/mobile/.env.example`. No Auth0 tenant, app registration, redirect allowlist, API resource/audience, or social connections have been configured. Live login/refresh has not been tested. The client requires an API audience before enabling sign-in because API access tokens must target the configured backend audience.
- The draft claimed Brenner had selected Auth0 and that ADR 0005 was Accepted. That claim is withdrawn. The provider pick is still open. See `docs/authentication-setup.md`.

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

## Target design and address search — 2026-11-23

Runtime proof is separated from code review below.

### Runtime proof: live filters on the previous Pages deploy

Pages run https://github.com/brennersta/Happengo/actions/runs/45154233288 succeeded for `c1fae62`. Headless Chromium then opened `https://brennersta.github.io/Happengo/?v=c1fae62`.

1. Open Filters, select Food, Apply. The list was only Market lunch. The only pin was `Market lunch, Food`. Screenshot `live-filter-food.png`.
2. Clear all, open Filters, turn on Happening now, Apply. The list was only Harbour choir. The only pin was `Harbour choir, Music, happening now`. Screenshot `live-filter-now.png`.

### Runtime proof: this design, local web export

From `/workspace`, `EXPO_PUBLIC_DEMO_MODE=true pnpm --filter @happengo/mobile export:web` completed with base path `/Happengo`. Playwright served that export at `http://127.0.0.1:4174/Happengo/` at 1280×800. Photon was stubbed in the browser. No request left the machine for Photon.

Checked in the page:

- Discover map: search field, map/list toggle, filter button, gradient Create Event, count pill "5 events", colored teardrop pins, floating text nav.
- List: "Events near you (5)" and View Event cards with gradient placeholders.
- Food then Apply left only Market lunch. Happening now then Apply left only Harbour choir.
- Typing `santa` showed "Santa Luzia, Minas Gerais, Brazil" and "Santa Luzia, Maranhão, Brazil", with the Photon attribution.
- Event detail, create, the start-now duration picker, My Events upcoming, and My Events past. The past list did not show a raw coordinate.

Before shots of the previous UI, same viewport: `before-discover-map.png`, `before-filters.png`, `before-event-detail.png`, `before-create.png`, `before-my-events.png`, `before-my-events-past.png`.

After shots: `after-discover-map.png`, `after-discover-list.png`, `after-filters.png`, `after-address-search.png`, `after-event-detail.png`, `after-create.png`, `after-create-when.png`, `after-my-events.png`, `after-my-events-past.png`.

Commands that were run for this slice:

```text
pnpm --filter @happengo/mobile exec tsc --noEmit
pnpm --filter @happengo/mobile test
pnpm --filter @happengo/mobile exec expo lint
```

`tsc` and lint exited 0. Mobile Jest: **60 passed**, including the pick-then-centre search test and `displayAddress`. The API was not changed, so `dotnet test` was not re-run here. CI still runs it when the workflow asks.

Address search requests Photon only when the typed text changes. Choosing a result does not search that label, and a later map-centre change does not either. `expo-linear-gradient` is `~58.0.4`.

The first `after-create.png` was blank because the shot landed before OpenFreeMap tiles arrived. The when-picker shot of the same screen already showed Tallinn, and the refreshed `after-create.png` waits for a tile. The refreshed `after-address-search.png` is after choosing Santa Luzia: the list is closed, the field keeps that label, and the count is 0 because the map moved. The browser log showed one Photon request, for `santa` only.

### Code review only

- Native teardrop pins and `Camera.easeTo` were not opened on a device. `tsc` includes `Map.native.tsx`.
- The public Photon host was not called. `photon.test.ts` stubs fetch and checks the URL, the limit, the centre bias, the language rule, and that no identifier is sent. A live search on the Pages demo belongs after this merges.
- Cover upload, albums, reactions, the friends graph, a profile photo, and the date-range filter are not in this slice.

## Discover filters — 2026-11-23

Runtime proof. The demo-pages section below is the previous slice.

`GET /v1/events` already filtered by any named tag. This slice adds `happeningNow=true`, which keeps `start_at <= now < end_at` inside `VisibleTo` map scope. Unlisted events stay off the map. The OpenAPI document and generated client include the new query flag. The demo fetch mock and MSW handler apply the same tag and happening-now filters.

Commands, from `/workspace`:

```text
dotnet format backend/Happengo.sln --verify-no-changes --no-restore
dotnet test backend/Happengo.sln --configuration Release
pnpm --filter @happengo/mobile exec tsc --noEmit
pnpm --filter @happengo/mobile test
pnpm --filter @happengo/mobile exec expo lint
pnpm --filter @happengo/api-client test
```

`dotnet format --verify-no-changes` exited 0. `dotnet test`: **210 passed, 0 failed**, including PostGIS. The happening-now case is inside `EventReadTests` and checks the half-open end plus an unlisted live event staying hidden. Mobile Jest: **51 passed**. api-client: **2 passed**, including no diff after `node ./scripts/generate.mjs`. Lint and `tsc --noEmit` exited 0.

Code review only: the filter panel was not clicked in a browser for this slice. Native map behavior is unchanged and was not opened on a device.

## Demo Pages — 2026-11-23

Runtime proof for the public demo. The earlier validation section below it is the first-event-journey run, before this demo build.

The static export does not use the MSW service worker. Production Metro replaces the `msw` package with an empty module, so `http.get` throws `Cannot read properties of undefined (reading 'get')`. `EXPO_PUBLIC_DEMO_MODE=true` turns on an in-page fetch mock and a fake signed-in session instead. A normal production web or native build does not set that flag, so it does not mock.

Commands, from `/workspace`:

```text
pnpm --filter "./apps/**" --filter "./packages/**" run lint
pnpm --filter @happengo/mobile exec tsc --noEmit
pnpm --filter @happengo/mobile test
pnpm --filter @happengo/api-client test
dotnet format backend/Happengo.sln --verify-no-changes --no-restore
dotnet test backend/Happengo.sln --configuration Release
EXPO_PUBLIC_DEMO_MODE=true pnpm --filter @happengo/mobile export:web
node apps/mobile/scripts/finalize-pages.mjs
```

Lint, `tsc --noEmit`, and `dotnet format --verify-no-changes` exited 0. Mobile Jest: 48 passed. api-client: 2 passed, including no diff after client generation. `dotnet test`: **210 passed, 0 failed**, including PostGIS. The anonymous `GET /v1/events/mine` response type is `https://happengo.app/problems/unauthorized`.

The export logged `Using (experimental) base path: /Happengo`. `index.html` references `/Happengo/_expo/...`. `finalize-pages.mjs` copies `index.html` to `404.html` and writes `.nojekyll`.

Playwright then served `apps/mobile/dist` at `http://127.0.0.1:4173/Happengo/` with the 404.html fallback. The page's own fetch mock answered the API. No route was stubbed from the test. Checked in the page:

- Banner text "Demo: sample data, nothing is saved".
- Harbour choir pin `rgb(124, 58, 237)` (Music) with one running aura animation.
- Market lunch pin `rgb(234, 88, 12)` (Food) with zero animations.
- Opened Market lunch from the card and from the pin.
- Joined Harbour choir.
- My Events Past showed Sunday picnic. Upcoming showed Studio night. Declined its seeded request.
- Created Night market with Tech as the main tag and approved the seeded request.
- The same Harbour choir pin under `prefers-reduced-motion: reduce` kept the green border and had zero animations.
- `GET /Happengo/events/00000000-0000-4000-8000-000000000001` returns the 404.html document, and a reload still shows Harbour choir.

Screenshots: `demo-01-discover.png` through `demo-10-deep-link.png`.

Code review only: native screens were not opened. No Auth0 tenant was created. GitHub Pages source was not switched to GitHub Actions from this environment; see the PR report.

## Validation — 2026-11-23

This section records commands that were actually run. Anything not listed here was read, not executed.

### Runtime proof

Backend, from `/workspace`, .NET SDK 10.0.404, Docker 29.1.3 with the `postgis/postgis:16-3.5` Testcontainers image:

```text
dotnet format backend/Happengo.sln --verify-no-changes --no-restore
dotnet test backend/Happengo.sln --configuration Release
```

`dotnet format --verify-no-changes` exited 0. `dotnet test` reported **210 passed, 0 failed**. That run includes the PostGIS integration tests, the OpenAPI drift test, tag-order create/read, and `GET /v1/events/mine` (owned, attending, requested only; anonymous 401; other users' events absent; a request drops at `end_at` while an owned event remains and is not happening).

Client, pnpm 10.34.9, Node 22:

```text
pnpm install --frozen-lockfile
pnpm --filter "./apps/**" --filter "./packages/**" run lint
pnpm --filter "./apps/**" --filter "./packages/**" exec tsc --noEmit
pnpm --filter "./apps/**" --filter "./packages/**" run test
```

Install, lint, and `tsc --noEmit` exited 0. Tests: api-client **2 passed** (the second regenerates `schema.ts` and requires no diff), mobile **43 passed**.

Web export:

```text
pnpm web:export
EXPO_PUBLIC_API_MOCK=true pnpm web:export
```

Both exports completed. The second bundle is the one walked, because the UI only allows create and My Events without a token when the mock flag is exactly `true`.

Playwright (Chromium) then served `apps/mobile/dist` and fulfilled `http://localhost:5080` with the same demo contract the unit tests cover. Checked in the page:

- Sample gathering pin background `rgb(124, 58, 237)` (Music), green live border, Web Animations entry running at 1600ms.
- Harbour dinner pin background `rgb(234, 88, 12)` (Food, the first selected tag), white border, no animation. It is upcoming, so it must not pulse.
- The same Music pin under emulated `prefers-reduced-motion: reduce` kept the green border and had an empty animation list.
- Created the event, saw it on Discover and in My Events Upcoming, opened it from the card and from the pin, declined one seeded request, approved a second event's request, and joined Sample gathering.

Screenshots from that run: `01-discover-live-pin.png` through `11-owner-approved.png`.

The static export's own MSW worker did **not** start. The console was `API mocks did not start. TypeError: Cannot read properties of undefined (reading 'get')` inside the bundled handlers chunk. The journey above is the exported UI against the demo contract, not a successful MSW service worker.

No identity provider is configured, so the browser did not call the real API. The PostGIS proof is the `dotnet test` run above. Test auth is an `X-Test-User` header and is not wired into the Expo client.

### Code review only

- Native map (iOS/Android). No simulator or device was available. `tsc` covers `Map.native.tsx`. Unit tests cover `markerColor`, `liveAuraMode`, and the half-open clock. The native component uses that helper: pulse when live, static ring when reduced motion is on. The native dev fetch patch now handles `GET /v1/events/mine` before the `events/{id}` matcher. That route was not run on a device.
- MSW inside the static web bundle, as above. Handler behavior was unit-tested, not served by the worker.
- The live Base44 site was not opened.

### Fixes applied after the unvalidated draft

- Restored the half-open window everywhere the draft had used `<= endAt`, including `VisibleTo`, `HappeningNow`, the demo contract, and both maps. Merged main kept PR #11's allow-list and hashed share tokens.
- `GET /v1/events/mine` compiles (`is` patterns are illegal in the EF expression) and returns only the caller's owned, attending, and active requested events.
- Tag order is asserted through validation, create, database read, and direct read. The first tag is the main tag.
- Create stores `ShareTokenHash` only. Reads still return `shareToken: null`. The plaintext is discarded, so the owner cannot show a share link until a later edit flow can issue it once.
- ADR 0005 is Proposed again. The draft's Auth0 decision was removed from the ADR, the baseline diagram, and the setup note.
- `azure.extensions` in Terraform is `POSTGIS,PGCRYPTO`. Nothing was applied.

### Still open, unchanged

Attendee identity display, maximum duration (the code still allows 7 days), incident tags and moderation, and livestream links. Do not decide them in passing.

## Backend hardening — 2026-11-23

### Implemented

- Forwarded headers are opt-in (ForwardedHeaders:Enabled, default false). Configured KnownProxies and KnownNetworks are parsed strictly and copied into ForwardedHeadersOptions; defaults remain empty. Outside Development, startup fails when forwarding is enabled without at least one trusted proxy/network. UseForwardedHeaders remains before authentication and rate limiting.
- Production-only startup guards now also apply in Staging. Both environments are covered for missing/local database settings, placeholder authority, and valid startup.
- Added owner-only POST /v1/events/{eventId}/share-link for unlisted events. It returns the new plaintext token once, stores only its SHA-256 hash in the existing share_token_hash column, invalidates the previous token, and does not add attendance or invite/grant rows. Anonymous gets a typed 401 ProblemDetails response; non-owners and ineligible events get the existing 404 ProblemDetails. No schema change or migration was needed.
- Regenerated api/openapi.json from the backend OpenAPI endpoint and regenerated packages/api-client/src/generated/schema.ts.

### Commands actually run

Docker/Testcontainers was available after starting the installed Docker Desktop app. Engine: 29.9.3. The test runner's first restricted process attempt could not connect to testhost; successful test runs used the approved elevated process so they could access Docker and the test runner.

Focused share-rotation integration tests:

~~~powershell
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
dotnet test backend/tests/Happengo.Api.Tests/Happengo.Api.Tests.csproj --configuration Release --no-restore --filter FullyQualifiedName~ShareLinkRotationTests
~~~

Result: 2 passed, 0 failed.

Backend-generated OpenAPI export:

~~~powershell
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:UPDATE_OPENAPI = '1'
dotnet test backend/tests/Happengo.Api.Tests/Happengo.Api.Tests.csproj --configuration Release --no-restore --filter FullyQualifiedName~OpenApi_document_matches_committed_contract
~~~

Result: 1 passed and api/openapi.json was rewritten from the live generated document.

TypeScript client generation, working directory packages/api-client:

~~~text
node ./scripts/generate.mjs
~~~

Result: openapi-typescript 7.13.0 regenerated src/generated/schema.ts.

Full backend suite, including Docker-backed integration tests and normal OpenAPI drift assertion:

~~~powershell
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
dotnet test backend/Happengo.sln --configuration Release
~~~

Result: 222 passed, 0 failed, 0 skipped. This includes forwarded-header rate-limit isolation for two client IPs behind a trusted proxy, ignored untrusted X-Forwarded-For, Staging and Production guard cases, ProblemDetails authorization, new-token success/old-token rejection, and unchanged attendance/invite rows.

### Read/review only (not executed as commands)

- Read GROK.md, docs/architecture/baseline.md, this handoff, ADR 0007, HashShareTokens, the rate limiter and auth middleware, existing production guard tests, Testcontainers setup, and the OpenAPI drift test.
- No Azure, Terraform, deployment, external service, or mobile files were changed.

Targeted formatting check for the changed C# files:

~~~powershell
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
dotnet format whitespace backend/Happengo.sln --verify-no-changes --no-restore --include backend/src/Happengo.Api/Infrastructure/ForwardedHeaderSettings.cs backend/src/Happengo.Api/Infrastructure/HappengoServices.cs backend/src/Happengo.Api/Infrastructure/Problems.cs backend/src/Happengo.Api/Infrastructure/ProductionConfiguration.cs backend/src/Happengo.Api/Events/ShareToken.cs backend/src/Happengo.Api/Events/RotateShareLink/RotateShareLink.cs backend/tests/Happengo.Api.Tests/Infrastructure/ProductionConfigurationTests.cs backend/tests/Happengo.Api.Tests/Infrastructure/RateLimitTests.cs backend/tests/Happengo.Api.Tests/Events/ShareLinkRotationTests.cs
~~~

Result: passed. A full-solution `dotnet format backend/Happengo.sln --verify-no-changes --no-restore` was also attempted but failed on pre-existing checkout-wide CRLF/LF differences. The targeted check above passed after normalizing line endings in the changed C# files.

## Backend hardening follow-up — 2026-11-23

- Merged `origin/main` into `codex/backend-hardening` with a merge commit (no rebase). Git auto-merged the handoff; both existing documentation sections and the Backend hardening section are present.
- Renamed the backend-hardening review note to `docs/features/reviews/0010-backend-hardening.md` and ensured it has a trailing newline.
- Reran the full backend suite after the merge and rename. Command: `$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'; dotnet test backend/Happengo.sln --configuration Release`. Result: **222 passed, 0 failed, 0 skipped**.

## Backend hardening follow-up — Friends merge (2026-11-23)

- Merged `origin/main` at `361bc75` (Friends, PR #21) into `codex/backend-hardening` using a merge commit; no rebase or force-push.
- Kept both `FriendRoutes.Map(v1)` and `RotateShareLink.Map(v1)` in `HappengoServices`, with the Friends and RotateShareLink usings.
- Resolved generated-file conflicts by regenerating from backend/client sources, not by hand-merging. OpenAPI export command:

~~~powershell
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:UPDATE_OPENAPI = '1'
dotnet test backend/tests/Happengo.Api.Tests/Happengo.Api.Tests.csproj --configuration Release --no-restore --filter FullyQualifiedName~OpenApi_document_matches_committed_contract
~~~

Result: 1 passed; `api/openapi.json` regenerated. Then, from `packages/api-client`, ran `node ./scripts/generate.mjs` (openapi-typescript 7.13.0). Both generated artifacts contain the Friends and share-link endpoints.
- Renamed this review note to `docs/features/reviews/0011-backend-hardening.md` (0010 is used by Friends); it ends with a newline.
- Post-merge full backend test command: `$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'; dotnet test backend/Happengo.sln --configuration Release`. Result: **229 passed, 0 failed, 0 skipped**.

## Backend maintenance — 2026-11-23

- Created `codex/backend-maintenance` from latest `origin/main` (`1f39679`).
- Applied the Dependabot updates intended to supersede PRs #8, #9, #10, #13, and #14: Npgsql EF Core PostgreSQL and NetTopologySuite 10.0.4; Microsoft.NET.Test.Sdk 18.12.0; Testcontainers.PostgreSql 4.17.0; coverlet.collector 10.1.1; xunit.runner.visualstudio 4.0.1. All package restores and tests passed.
- In `FriendRoutes.RotateInvite`, token generation now occurs only after the existing-row path is selected; a new invite row continues to get its token from `IssueAsync`.
- Updated the backend-hardening review note heading and test count to **229 passed, 0 failed, 0 skipped** (post-Friends merge).
- OpenAPI drift check command: `$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'; Remove-Item Env:UPDATE_OPENAPI -ErrorAction SilentlyContinue; dotnet test backend/tests/Happengo.Api.Tests/Happengo.Api.Tests.csproj --configuration Release --filter FullyQualifiedName~OpenApi_document_matches_committed_contract`. Result: **1 passed, 0 failed, 0 skipped**.
- Full backend command: `$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'; dotnet test backend/Happengo.sln --configuration Release`. Result: **229 passed, 0 failed, 0 skipped**.
- No mobile, migration, infrastructure, or deployment changes were made in this maintenance branch.

## Edit and cancel events — 2026-11-23

### Implemented

- Added `PATCH /v1/events/{eventId}` for owners. Anonymous requests receive 401 ProblemDetails; non-owners receive 404 ProblemDetails. The endpoint reuses `CreateEventValidator`, preserving visibility and approval mode from the stored event, retaining selected tag order, replacing invited friend tags, and rejecting ended events with 409 ProblemDetails.
- Added owner-only `POST /v1/events/{eventId}/cancel`. The new nullable `cancelled_at` column is in migration `20261123150041_CancelEvents`; the migration and its designer were saved as UTF-8 without BOM. No merged migration was edited.
- `VisibleTo` map scope filters cancelled events before filters and pagination. Direct event reads retain normal visibility rules and include `cancelledAt`; My Events retains cancelled owned/attended events. A join to a cancelled event returns 409 ProblemDetails. Cancelled unlisted tokens no longer serve shared reads.
- Event detail has owner Edit and Cancel event actions, a confirmation dialog, and a cancelled banner with attendance actions hidden. Edit opens the create form with event fields prefilled; visibility/approval controls remain locked and time-zone-local date inputs are supported.
- Added `cancelledAt` to demo event responses, edit/cancel mock endpoints, cancelled map filtering, cancelled My Events badges, and English/pt-BR strings.
- Added `openapi-fetch` and `@types/react-test-renderer` as direct mobile dependencies because the typecheck exposed existing direct imports without declarations in the mobile manifest.
- Added review note `docs/features/reviews/0013-edit-cancel-event.md` after review note 0012 was assigned to the map-location work.

### Commands run and results

Backend-generated OpenAPI update mode:

~~~powershell
$env:DOTNET_CLI_TELEMETRY_OPTOUT='1'
$env:UPDATE_OPENAPI='1'
dotnet test backend/tests/Happengo.Api.Tests/Happengo.Api.Tests.csproj --configuration Release --no-restore --filter FullyQualifiedName~OpenApi_document_matches_committed_contract
~~~

Result: 1 passed and `api/openapi.json` regenerated. Then, from `packages/api-client`, ran `node ./scripts/generate.mjs` with openapi-typescript 7.13.0 to regenerate `src/generated/schema.ts`.

Explicit OpenAPI drift check (update mode unset):

~~~powershell
$env:DOTNET_CLI_TELEMETRY_OPTOUT='1'
Remove-Item Env:UPDATE_OPENAPI -ErrorAction SilentlyContinue
dotnet test backend/tests/Happengo.Api.Tests/Happengo.Api.Tests.csproj --configuration Release --filter FullyQualifiedName~OpenApi_document_matches_committed_contract
~~~

Result: 1 passed, 0 failed, 0 skipped.

Focused edit/cancel integration tests:

~~~powershell
$env:DOTNET_CLI_TELEMETRY_OPTOUT='1'
$filter='FullyQualifiedName~EditEventTests|FullyQualifiedName~CancelEventTests'
dotnet test backend/tests/Happengo.Api.Tests/Happengo.Api.Tests.csproj --configuration Release --no-restore --filter $filter
~~~

Result: 6 passed, 0 failed, 0 skipped.

Full backend suite:

~~~powershell
$env:DOTNET_CLI_TELEMETRY_OPTOUT='1'
dotnet test backend/Happengo.sln --configuration Release
~~~

Result: 235 passed, 0 failed, 0 skipped.

Mobile checks, from repo root:

~~~text
pnpm --filter @happengo/mobile test --runInBand
pnpm --filter @happengo/mobile typecheck
~~~

Result: Jest 22 suites / 69 tests passed; typecheck passed. The existing ignored `@parcel/watcher` build script was not approved or run; the frozen dependencies were installed with scripts ignored.

### Scope

- No infrastructure, deployment, Azure, or Terraform changes. No existing migration was modified.
## Reports and moderation — 2026-11-25

### Implemented

- Added `POST /v1/reports` for authenticated reports on visible, non-cancelled events and active incidents. Reasons are fixed to `inappropriate_content`, `spam_scam`, `fake_misleading`, and `harassment_unsafe`. A unique database index and transaction advisory lock enforce one report per user and target. Three unique reports set `priorityReview`; content is never hidden automatically.
- Added `Moderation:ModeratorUserIds` configuration matching identity-provider `sub` values. `users.is_moderator` is synced on sign-in; there is no role-grant API. `GET /v1/me` exposes the moderator flag for app navigation.
- Added moderator-only queue, incident-close and event-hide routes. Anonymous requests return 401 ProblemDetails; non-moderators return 404 ProblemDetails. Queue order is priority flag first, then latest report.
- Successful moderation updates and `moderation_actions` audit rows are committed in one database transaction. The supplied reason is stored in the audit record; the event hide reason is also stored on the event. Incident close_reason retains the constrained `moderator` value.
- `events.hidden_at` and `hide_reason` are persisted. The shared `VisibleTo` query keeps a hidden event visible to its owner and hides it from all other viewers.
- Added report controls to event and incident detail, moderator queue screen and profile link, en/pt-BR strings and mock endpoints/sample queue data.
- Added `docs/features/reviews/0021-reports-moderation.md`.

### Commands run and results

OpenAPI update (export test is isolated from Testcontainers and uses a local, unopened DB connection):

~~~powershell
$env:DOTNET_CLI_TELEMETRY_OPTOUT='1'
$env:UPDATE_OPENAPI='1'
dotnet test backend/tests/Happengo.Api.Tests/Happengo.Api.Tests.csproj --no-build --filter FullyQualifiedName~OpenApi_document_matches_committed_contract
~~~

Result: 1 passed. Regenerated `api/openapi.json`. Then ran `node scripts/generate.mjs` from `packages/api-client`; generated client includes Reports, Moderation, and `isModerator`.

OpenAPI drift tests:

~~~powershell
$env:DOTNET_CLI_TELEMETRY_OPTOUT='1'
Remove-Item Env:UPDATE_OPENAPI -ErrorAction SilentlyContinue
dotnet test backend/tests/Happengo.Api.Tests/Happengo.Api.Tests.csproj --no-restore --filter FullyQualifiedName~OpenApiDriftTests
~~~

Result: 3 passed, 0 failed.

Backend tests not requiring the Docker integration fixture:

~~~powershell
$env:DOTNET_CLI_TELEMETRY_OPTOUT='1'
dotnet test backend/Happengo.sln --no-restore --filter 'Category!=Integration'
~~~

Result: 43 passed, 0 failed.

Full backend suite:

~~~powershell
$env:DOTNET_CLI_TELEMETRY_OPTOUT='1'
dotnet test backend/Happengo.sln --no-restore
~~~

Result: 43 passed, 218 failed during Testcontainers startup because Docker Desktop's Linux engine pipe is absent (`npipe:////./pipe/dockerDesktopLinuxEngine`). Docker Desktop launch also failed: its CLI could not locate installation registry keys. Treat the 218 failures as environment-blocked database tests, not passing tests; rerun when Docker is available.

Formatting:

~~~powershell
$env:DOTNET_CLI_TELEMETRY_OPTOUT='1'
dotnet format backend/Happengo.sln --no-restore --verify-no-changes --include <changed backend files>
~~~

Result: changed-file verification passed. Full-solution verification reports many existing whitespace and line-ending violations in untouched files (e.g. existing event and test files); no whole-repository reformat was applied.

Mobile checks (repo root):

~~~text
pnpm --filter @happengo/mobile lint
pnpm --filter @happengo/mobile typecheck
pnpm --filter @happengo/mobile test --runInBand
pnpm --filter @happengo/mobile export:web
~~~

Result: lint passed; typecheck passed; Jest 27 suites / 80 tests passed; web export succeeded (`WEB_EXPORT_EXIT=0`). Earlier pnpm workspace symlink and testhost named-pipe failures were sandbox restrictions; rerunning these commands outside the sandbox resolved them.

### Remaining check

- Rerun the full backend suite with Docker Desktop's Linux engine available; this will exercise the new reports/moderation database tests and migration application. The local branch is ready for a PR once those integration tests pass or CI confirms them.
- No infrastructure, deployment, Azure, or Terraform changes. Migrations are new; none of the merged migrations was edited. Both migration source files are UTF-8 without BOM.

### Moderator configuration

Set `Moderation__ModeratorUserIds__0=auth0|<subject>` for each configured moderator subject ID. Store these IDs in the existing hosting configuration/secret mechanism; this change does not provision infrastructure.

## Map and incident UX follow-up (2026-11-25)

Work is on `codex/fix-incident-map-ux`, based on `origin/main` at `80b629d`; it is separate from the open reports/moderation branch/PR.

- Fixed the create-kind choice page's unbounded full-width layout with a centered, 680px maximum content area.
- In incident and event creation, a map tap selects coordinates and reverse-geocodes a readable address through Photon. If Photon has no address or fails, the selected coordinates are shown in the address field so the point can still be submitted. Address text editing clears the previous coordinate selection so a newly typed query cannot submit against a stale point.
- Added explicit “Use current location” actions to both forms. They call the existing device-location permission flow only when tapped; no prompt occurs on first launch. On web, the browser requires a secure origin for geolocation.
- Discover marker taps open a shared event/incident preview with a button to open full detail; the web-only generic MapLibre text popup was removed.
- Updated the feature catalog and review note 0024. Incident photos are intentionally out of scope for v1 per ADR 0012. Event albums and post-start reactions are still absent from the rebuild, despite appearing in the Base44 detail screenshot; there is no rebuilt media/reaction API yet, and `GROK.md` says not to begin those features in this slice.

### Commands actually run

From the repository root:

~~~text
pnpm --filter @happengo/mobile lint
~~~

Result: passed (exit code 0).

~~~text
pnpm --filter @happengo/mobile typecheck
~~~

Result: passed (`tsc --noEmit`, exit code 0).

~~~text
pnpm --filter @happengo/mobile export:web
~~~

Result: passed; Expo exported the web app to `apps/mobile/dist` (exit code 0).

~~~powershell
Get-Content apps/mobile/src/i18n/locales/en.json | ConvertFrom-Json | Out-Null
Get-Content apps/mobile/src/i18n/locales/pt-BR.json | ConvertFrom-Json | Out-Null
~~~

Result: both locale files parsed successfully.

### Read/review only (not executed)

- Read `GROK.md`, `docs/architecture/baseline.md`, this handoff, ADR 0012, the event/incident feature catalog, incident creation/detail and Discover screens, map platform adapters and marker factory, geocoding, and location-permission helpers.
- Jest was not run. No backend tests, infrastructure, deployments, or Azure/Terraform operations were performed.

## Event detail visual alignment (2026-11-25)

Merged to main in PR #40 from `codex/event-detail-design`, based on `origin/main` at `8557797` (which includes the map/incident UX PR #39).

- Compared the existing detail layout with the reviewed Base44 `Event_Detail` screenshots. The app already had the gradient cover placeholder, event card, tags, event facts, and attendance actions, but the desktop content was narrower and the card's spacing/title hierarchy were less faithful.
- Expanded the centered content width to fit the screenshot's roughly 864px inner card at desktop width, increased card padding, refined title/action alignment, and spaced the icon-led facts around a clearer divider.
- Left the event data/actions, mobile stacking, and responsive behavior intact. Did not add photo/reaction sections: no APIs/storage support exists and `GROK.md` says to defer those features.
- Updated the feature catalog and review note 0025.

### Commands actually run

From the repository root:

~~~text
pnpm --filter @happengo/mobile lint
~~~

Result: passed (exit code 0).

~~~text
pnpm --filter @happengo/mobile typecheck
~~~

Result: passed (`tsc --noEmit`, exit code 0).

~~~text
pnpm --filter @happengo/mobile export:web
~~~

Result: passed; Expo exported the web app to `apps/mobile/dist` (exit code 0).

Jest was not run.

### Read/review only (not executed)

- Read the event detail screen, theme/components, event feature catalog, review note 0009, and `GROK.md`.

## Map pin selection regression and handoff cleanup (2026-11-25)

Work is on `codex/fix-event-pin-click`, based on `origin/main` at `fa448c8` (includes merged PR #40).

- Fixed event/incident marker taps appearing to do nothing. Discover set the selected marker id, but also cleared it from the map's general tap handler. The installed MapLibre web `Marker` click propagates to the map click handler, which immediately cleared the preview. Discover no longer dismisses the preview on a map tap. The preview's close control and selecting another pin remain available. Create-form map taps are unchanged.
- Updated `GROK.md` to say PR #40 was merged and point at this follow-up. Review note 0026 records the regression and fix.

### Commands actually run

From the repository root:

~~~text
pnpm --filter @happengo/mobile lint
~~~

Result: passed (exit code 0).

~~~text
pnpm --filter @happengo/mobile typecheck
~~~

Result: passed (`tsc --noEmit`, exit code 0).

~~~text
pnpm --filter @happengo/mobile export:web
~~~

Result: passed; Expo exported the web app to `apps/mobile/dist` (exit code 0).

Jest was not run.

### Read/review only (not executed)

- Reviewed Discover's marker selection and preview selection code, web and native map press wiring, and the installed MapLibre GL `src/ui/marker.ts` click implementation to confirm marker clicks propagate to the map handler.

## Expand Create options on Discover (2026-11-25)

Work is on `codex/create-expand-menu`, based on `origin/main` at `ad03586` (includes PR #41).

- Replaced the standalone event/incident choice page with a compact menu that expands from the Discover Create button. The person can create an event or report an incident; tapping outside or Create again dismisses the menu.
- `/events/create` now opens the event form directly unless an event id is supplied for editing. The Discover menu navigates to the event form with an explicit event type and to the incident form.
- Added en and pt-BR accessibility labels. Review note 0027 records this change.

### Commands actually run

From the repository root:

~~~text
pnpm --filter @happengo/mobile lint
~~~

Result: passed (exit code 0).

~~~text
pnpm --filter @happengo/mobile typecheck
~~~

Result: passed (`tsc --noEmit`, exit code 0).

~~~text
pnpm --filter @happengo/mobile export:web
~~~

Result: passed; Expo exported the web app to `apps/mobile/dist` (exit code 0).

Jest was not run.

### Read/review only (not executed)

- Reviewed Discover toolbar layout, event/incident create routing, and existing localized choice strings.
