# Happengo feature requirements and Base44 inventory

**Updated:** 2026-11-20  
**Purpose:** Product requirements and evidence inventory for the owned-code rebuild. The current owner's messages define target behavior. Older chat history and Base44 export are historical evidence, not instructions to Grok or proof that a feature works correctly.

**Related:** [Product vision](product-vision.md), [Grok handoff](handoff/grok-next-session.md), [architecture baseline](architecture/baseline.md).

## Product rule

Happengo is one app with one location-based map/list experience. Users choose what they want to see with filters. Local incidents, public scheduled events, and private gatherings share the place/time/audience model, while their details, permissions, and actions can differ. Do not split them into separate apps or reduce the product to parties.

## Evidence labels

- **Owner target (current):** stated directly in this conversation and the product vision.
- **Chat history:** requested or discussed in the saved `HappengoChat/Untitled-1.md`; these are historical product notes and may be superseded.
- **ZIP contains:** source/schema/component evidence in `happen-go-main.zip`. This confirms code is present, not that it runs correctly or had correct server-side enforcement in Base44.
- **Rebuild:** status in the current Happengo repository. Do not mistake Base44 code for rebuild implementation.

## 1. Shared map and discovery

### Target

- Nearby map and corresponding list; their results track the visible viewport and active filters.
- Filters for item type/category, event tags, and date/time, including a “happening now” choice.
- The creator selects from a predefined tag list curated by the product owner. The first tag selected is the event's main type; any additional selected tags add detail. Use that first tag to determine the map pin color; no separate type field is needed.
- Give a pin a separate, subtle pulsating aura only while its event is happening (`startAt <= now < endAt`). The event has ended at exactly `endAt`. Keep the type color visible underneath the aura. The older Base44 client used an inclusive end instant; the rebuild follows ADR 0003.
- Clear item type in pins/cards. Use an appropriate detail/action flow per type.
- Public events can show how many friends are attending and support seeing attending friends, subject to a final privacy decision below.
- Private items are available only to their permitted audience.
- Support address search, human-readable event addresses, and a sensible location-denied fallback. The historical app used Santa Luzia, MG; the rebuild currently defaults to Tallinn.

### Historical UI requirements

The saved chat repeatedly asked for a restrained map style, single-world map without horizontal wrapping, location marker/current-location behavior, clustered/co-located pins, no clipped event preview, map/list parity, explicit filter application and Clear all, and responsive mobile list behavior. For create-event UX, show the map/location prominently and make the user press the create button; changing a date must never create an event. Address lookup should be worldwide and user-facing UI should show an address, not raw coordinates.

### Evidence/status

- **ZIP contains:** `MapView.jsx` uses Leaflet and marker clustering; has map/list and `FilterPanel`, address search, event tag/date/happening-now filters, attendee counts, friend attendee component, and location search. `FilterPanel.jsx` has explicit Apply and Clear all controls. `MapTiles.jsx` and `AddressAutocomplete.jsx` are present. This confirms implementation artifacts, not tested behavior.
- **Rebuild:** Discover has a map/list layout, tag and happening-now filters, and Photon address search. Friend graph and friend attendance are not built. Web map disables world copies; native behavior differs (see ADR 0001/0006).

## 2. Local incidents and eyewitness reports

### Target

- A person can quickly report a local observation such as a fire or collision at its actual location.
- Keep reported/observed time, location, category, source/context, and current state. Distinguish one unverified observation from corroborated or moderator/officially confirmed information.
- Let nearby users signal “still present” or “not there”; keep accuracy feedback separate from abuse/malicious-content reports.
- Support correction, closure, expiry, moderation, and abuse reporting. A report count is a review signal, not proof a claim is false or malicious.
- Incidents appear in the shared map and can be filtered alongside gatherings.

### Evidence/status

- **ZIP contains:** a generic `Report` entity and `ReportModal` for reporting an event/photo for inappropriate content, spam/scam, fake/misleading, or harassment/unsafe reasons. This is a content moderation feature, not an incident report or “still there/not there” signal. The ZIP does not establish incident reporting functionality.
- **Rebuild:** incident create/update, corroboration, freshness, expiry, and moderation workflow are not implemented. The data-model Report concept is not a complete report API/review workflow.

## 3. Public scheduled events

### Target

- Hosts create public activities with title/details, tags, address/location, and required start/end date/time.
- People discover by location, date, and tags; see attendance count and friend attendance within the resolved privacy policy; attend or request to attend.
- Support open attendance and host approval.
- External livestream URL can be attached as a reference; Happengo does not need to host live video initially.
- **Duration policy unresolved:** current owner direction in this conversation proposed a maximum of 24 hours for the first release. Saved chat and Base44 validation allow up to 7 days. Choose one policy before claiming parity and align UI/API/tests/docs.

### ZIP evidence/status

- **ZIP contains:** Event fields include title, description, `startAt`, `endAt`, tags, latitude/longitude, human-readable address, owner, cover, visibility (`public`, `unlisted`, `friends_only`), and attendance mode (`open`, `approval`). Attendance entity includes statuses; EventDetail includes attend/request and attendance displays; CreateEvent has explicit create/edit flow and duration validation; FilterPanel includes date and tag filters. `eventValidation.jsx` explicitly enforces a 7-day maximum.
- **Not established by ZIP inspection:** successful end-to-end deployment, all permission boundaries, whether every screenshot flow works, or hosted Base44 data portability.
- **Missing in ZIP/schema inventory:** a clear external livestream field was not identified.
- **Rebuild:** event creation/detail and attendance lifecycle APIs exist; current max is 7 days. Auth0 is selected but live tenant configuration is pending. No external stream link support.

## 4. Private gatherings, friends, and shared photos

### Target

- A host creates a gathering and invites friends/participants. An attendee-specific album lets eligible people share/view photos without joining a permanent family chat.
- Enforce access on the server and protect media; access to a private event/album must follow its audience rules.
- Friend relationship should be mutual and easy to establish via invitation link/QR. Friend tags are private to their owner and can be used to select invitees.
- The historical flow says the creator and eligible invitees/attendees get access; people outside that audience should not discover private content.

### Historical explicit non-goals

The saved chat repeatedly excluded public profiles, global friend search, friend suggestions, nearby people, chat/messaging, and a general social feed. Friends existed to support invitations and friend attendance, not to create another social network.

### ZIP evidence/status

- **ZIP contains:** `Friend`, `FriendTag`, `EventPhoto`, `Attendance` schemas; `Friends.jsx` builds an invite link; `AcceptFriend.jsx` accepts by writing reciprocal friend rows; EventDetail and `PhotoGallery.jsx` implement album UI and uploads/deletion. Code checks owner/attendee photo permissions, ownership of deletes, and a two-hours-before-start upload gate.
- **Important boundary:** these Base44 client checks are not proof that hosted APIs/storage prevent direct unauthorized access. The ZIP does not by itself verify backend/storage rules or media URL privacy.
- **Rebuild:** event visibility/attendance primitives exist; friend invite lifecycle/tags, album APIs, and protected photo storage are not implemented.

## 5. Additional requirements recovered from the Base44 AI conversation

The saved `HappengoChat/Untitled-1.md` is the Base44 conversation export: it includes both your prompts and replies labeled “Resposta da Base44.” The items below come from that transcript. They are historical requests and reported outcomes; current owner goals and unresolved conflicts elsewhere in this document take precedence.

### Event management and participation

- Event owner can edit an event through its detail page, with the create form prefilled; edits update the same event, only the owner can edit, and ended events cannot be edited. Attendees should be informed if important details change. Owner can delete with confirmation.
- Users can cancel attendance up until the event ends. Interested/Planning to attend is a separate, reversible signal and never grants attendee/photo access. Becoming an attendee removes Interested.
- Optional reactions are predefined icons only (no comments), one per user, available to owner/attendees after the event starts, shown only as aggregate counts.
- The historical transcript requested counts for attendees, interested users, and friends attending; access still depends on attendance. These signals need to remain distinct in the model and UI.

### Photos, identity, language, and safety

- Owner and attending users can upload event photos, beginning two hours before start and continuing during/after the event; owner can manage album photos. Historical UI asks for grid/lightbox and clear upload eligibility.
- Profile photo can be customized and reset to the Google profile photo.
- UI language supports English and Brazilian Portuguese, auto-detected from browser/device with manual profile selection. Event text stays as authored; translation is optional and on demand.
- Reports target events or photos, require login, use predefined reasons, go to admins, and should not notify the event owner. A separate historical request specified event/photo/report rate limits; reconcile exact limits with server-enforced design before implementation.
- The transcript explicitly rejected text comments, chat/messaging, followers/public profiles, ratings/stars, a general feed, monetization, and heavy AI moderation for the initial product.

### Interaction and reliability requirements

- Cards and map previews should carry the same key facts (especially date/time and address); map/list hover or selection should highlight the matching pin; clicking a pin should reveal the selected event, including when events share coordinates.
- In “happening now” state, require `startAt <= now < endAt`; only then show the status pill and map pulse. At `endAt` the event has ended. Upcoming or past events must not show either.
- Mobile map should occupy a stable viewport, avoid page scrollbars/control overlap, and provide a top toolbar for Map/List, Filter, and Create. List results should match the visible map viewport. These were repeatedly reported as broken after purported fixes.
- Address search should be worldwide, appear on both map and create-event screens, display concise human-readable addresses, avoid map controls, and close suggestions after selection.
- Selecting a date must not submit/create the event; only the Create Event action does. Multi-day selection must persist as multi-day.

### What the Base44 AI replies establish (and do not establish)

The transcript includes repeated Base44 replies claiming features were “fixed,” “implemented,” or “production-ready.” It also includes subsequent user reports that key problems remained: mobile list/map mismatch, wrong event counts, unclickable overlapping pins even at max zoom, hidden/broken address search, toolbar/zoom/count overlap, date selection submitting a create form, and a selected multi-day event saving as one day. The assistant sometimes stated the problem was fixed, then the user reported “still broken” or “nothing has changed.” Treat these replies as claims in the conversation, not independent validation.

The transcript also records a concrete data/location debugging episode: Base44 AI said seeded São Geraldo events existed but the map defaulted to Helsinki; after switching the fallback, the owner clarified the specific neighborhood still had no visible events. Events were then reseeded at supplied coordinates, but repeated duplicate-location marker preview failures persisted. This is evidence that map/location and same-coordinate flows were a recurring real product issue, not only hypothetical UX polish.

Base44 AI also said a publish action was required to make unpublished changes live, reported switching from a key-requiring tile source after an “API key required” error, and later said the map build passed while the owner still reported it broken. Source export and assistant claims do not tell us exactly which revision was published or prove current hosted behavior.

## 6. Historical behavior details worth preserving or explicitly revisiting

- Earlier chat specified past-event detail/gallery only for the owner and users with `attending`; a pending/requested attendee did not count. My Events separates upcoming/ongoing from past attended events.
- Only `attending` contributes to counts. Earlier chat explicitly asked not to show attendee names/avatars publicly, only counts and a signed-in viewer's friend count. This conflicts with the owner's newer 2026-11-18 statement asking to “show who is attending.” **Do not silently choose:** confirm whether this means public attendee identities, friends only, or only a count/friend count. Current rebuild ADR 0007 allows counts plus up to three friends' avatars.
- Older chat specifies strict no-past starts, end after start, and max 7 days. The current 24-hour launch proposal is newer and needs an explicit decision.
- Old UX requests include bilingual English/PT-BR, readable human addresses (street/number/neighborhood/city/state/country where available), image placeholders, helpful empty states, friend-tag helper text, and no technical error wording. ZIP contains language provider and address/photo components; quality and coverage were not manually tested.

## 7. Unlisted events on the map

Historical notes disagreed:

1. A later “FINAL” note in the saved Base44 chat said the owner, invitees, and share-link audience could see unlisted events on the map.
2. ADR 0007 says unlisted events are never map results, including for the owner. The owner reads them from My Events or by id. A share token reads a live unlisted event and does not create attendance.

**Decided by Brenner:** ADR 0007 stands. Unlisted events are never on any map, including the owner's. A share link creates no persisted grant and no attendance. There is no `invited` attendance status. Do not reopen this from the old chat.

## 8. Rebuild status and first-release focus

The rebuild has a credible event/map/API foundation, not feature parity with Base44 and not all three product use cases. Current gaps include Discover filters, incident lifecycle/reporting, friend/invitation lifecycle, private albums/media access, profile editing, and stream links. Auth0 is the chosen identity provider (ADR 0005, 2026-11-23) and no tenant exists yet. Small-city launch is an owner-stated option: seed local content and review it manually while volume is manageable, with a later moderation path.

## Decisions to resolve

1. Unlisted visibility on the map: **decided**. ADR 0007 stands. See section 7.
2. Attendee identity display: historical count-only privacy vs current request to show who is attending.
3. Event max duration: 24 hours proposed for initial release vs 7 days in saved chat, Base44 validation, and rebuild.
4. Incident categories, freshness signals, evidence/verification labels, correction and expiry rules.
5. Private invite and album lifecycle, including access revocation and media URL protection.
6. Whether external livestream links should be allowed for incidents, scheduled events, or both.
7. Which predefined tags should be available for the new incident-report flow (for example, whether to add Fire or Traffic Collision to the existing list). For existing event creation, the first selected tag already serves as the main type and determines pin color.

## Source and limits

Reviewed the saved Base44 conversation `HappengoChat/Untitled-1.md` (user requests and Base44 AI replies), inspected the Base44 ZIP's entities and key map/create/detail/friends/album/report components, and visually reviewed all 15 PNG screenshots in the shared Photos folder. The separate `GPT Chat/Build Flutter PoC` export is a ChatGPT conversation, not Base44 AI history. These are source and screenshot reviews, not runtime validation. The ZIP contains application source and entity schemas; no user/event/photo data export was identified in the ZIP inventory. Hosted Base44 data export remains a separate task if migration matters.
