# Happengo — feature catalog

**Updated:** 2026-11-20

This catalog describes the features page by page. Each entry gives a **feature name** and **what it represents**, followed by evidence about the Base44 export and current owned-code rebuild where useful. For the overall business description, see the [product description](product-description.md).

## How to read the status

- **Base44 source:** the ZIP contains related UI, component, or entity code. This does not prove the hosted feature worked or that its privacy checks were enforced by Base44's backend.
- **Base44 conversation:** the Base44 AI said it made a change. Treat that as a historical claim unless source or user validation supports it.
- **Rebuild:** status in the owned-code repository at the time this catalog was written. A foundation is not full feature parity.
- **Product goal:** requested for Happengo, but not established as implemented in the Base44 export.

The page list follows the exported Base44 project. “Incident reporting” and “livestream links” are product-level features, not pages found in that export.

## A. Map View / Discover

**Purpose:** Let people understand what is happening nearby or at a searched location and move between a map and a matching list.

| Feature name | What it represents | Base44 source | Rebuild |
|---|---|---|---|
| Map discovery | Shows eligible events at geographic locations so users can explore nearby activity. | `src/pages/MapView.jsx` renders a Leaflet map and event markers. | Map viewport reads and map rendering exist. |
| Main type from tags | The creator chooses from the predefined tag chips. The first tag selected is the event's main type; any other selected tags are additional descriptors. There is no separate type field or second taxonomy step. | The form stores tags and MapView uses the first tag (`tags[0]`) as the primary category for pin styling. Current visible tags include Music, Sports, Food, Art, Family, Tech, Nightlife, Outdoor, Culture, and Education. | Event tags exist in the API. Preserve which tag was selected first so it remains the main type; no separate type field is required. |
| List discovery | Shows event cards as an alternative or companion to the map. List results should correspond to the visible map area. | Map/List toggle and viewport/list logic exist; the conversation records repeated mobile mismatch bugs. | Discover list uses the same viewport results as the map. |
| Event markers and previews | A marker opens the selected event's key facts: title, address, schedule, tags, cover, and attendance context. | MapView popup includes event information. The conversation reports that same-location markers often remained unclickable even after claimed fixes. | Marker-to-detail navigation is wired for web/native; detail shows core fields and attendance controls. Runtime validation pending. |
| Marker clustering | Combines nearby markers at lower zoom levels to reduce clutter, while still allowing access to individual events. | `react-leaflet-cluster` is used. Duplicate-coordinate preview problems are documented in the Base44 chat. | Map supports the rebuild's marker rendering; production density behavior still needs product validation. |
| Tag filters | Lets people choose which predefined tags appear on the map/list. The first selected tag is the main type; other tags give additional context. | `FilterPanel.jsx` includes tag filters. The wider incident/event/private discovery filter is not established in the ZIP. | A right-side filter drawer shows tag chips with viewport counts, Apply, and Clear all. The API keeps events that have any selected tag. |
| Type-colored map pin | Gives each main tag a distinct pin color so users can recognize the event's primary type at a glance. | MapView maps the first selected tag to a category color ring; the pin body itself remains the same purple. | Shared tag color mapping and web/native marker coloring are drafted; runtime validation is pending. |
| Live-event pulse aura | Adds a subtle, continuously pulsating aura around a pin only while the event is happening, to make active events noticeable without changing their type color. “Happening” means `startAt <= now < endAt`. The event has ended at `endAt`. | MapView has a pulse animation when `startAt <= now <= endAt`; its pulse is separate from the category ring. That inclusive end is historical Base44 behavior, not the rebuild rule. | Web and native auras use the half-open rule and a static ring under reduced motion. |
| Date/time filters | Narrows the map/list to a period or events happening now. | Filter panel has date range and “happening now”; explicit Apply and Clear all controls are present. | The filter drawer has a happening-now toggle using `startAt <= now < endAt`. A date-range filter is not implemented. |
| Address search | Lets a person navigate to a street, neighborhood, or city instead of relying only on current GPS. | `AddressAutocomplete.jsx` and MapView integration exist; history requests worldwide results and records repeated placement/visibility bugs. | Discover's top bar searches Photon and moves the map. Suggestions include region and country. Create uses the same lookup to set the address and event pin. |
| Current location and fallback | Centers the map near the user when allowed and gives a useful default when location is unavailable. | Geolocation and fallback behavior exist; conversation records an incorrect Helsinki fallback for a Brazil test and subsequent correction. | Rebuild currently defaults to Tallinn; device location and a user-appropriate fallback need alignment. |
| Map appearance and controls | Keeps the map legible, avoids horizontal world repetition, and prevents toolbars/search/counts from covering zoom controls. | Map tile styles and layout were repeatedly changed; the owner reported overlap and API-key issues. | Web map disables world copies; native differs. See ADRs 0001 and 0006. |
| Happening-now indicator | Identifies an event as live only between its start and end times, with a restrained marker/card cue. | MapView computes start <= now <= end and styles live markers. History records incorrect future-event labels and missing/inconsistent visual cues. | Not a complete Discover feature yet. |
| Friend attendance context | Helps a signed-in user see whether friends plan to attend or are attending. | MapView and `FriendAttendees.jsx` show friend counts and friend profiles. This conflicts with earlier count-only privacy notes and needs the decision in the product description. | Friend graph and friend attendance display are not implemented. |
| Contextual event count | Reassures the user that events are available without permanently obscuring the map. | Conversation requested conditional count and reported inaccurate counts after map/list changes. | Count exists in the rebuild map/list shell; validate against visible results. |
| Create-event entry point | Starts event creation from the main discovery experience. | MapView has a Create action. | Create screen and API foundation exist. |

## B. Create Event

**Purpose:** Let a host publish or edit a scheduled event at a chosen place, date, and audience.

| Feature name | What it represents | Base44 source | Rebuild |
|---|---|---|---|
| Event details | Captures title, description, and tags so people know what the event is. | `src/pages/CreateEvent.jsx` contains the form and tag selection. | Create API/client flow supports core fields and tags. |
| Main type selection through tags | The host selects from the existing predefined tag chips. The first selected tag is the main type and drives the pin color; more selected tags add descriptors. | CreateEvent provides tag chips and MapView reads the first tag for category styling. | Ordered multi-select, main-tag cue, non-empty validation, API contract and marker color mapping are drafted; runtime validation pending. |
| Date and time range | Captures when the event starts and ends, with start/end validation. | `WhenSelector.jsx` provides a time-range selector; ZIP validation allows up to 7 days. History reports dates sometimes auto-submitted the form and multi-day events sometimes saved as one day. | Start/end fields and validation exist; current limit is 7 days. Owner's newer 24-hour launch proposal is unresolved. |
| Choose a location | Allows map tapping and address selection so the pin represents the real place. | Map picker, reverse-geocoding, and address autocomplete are present. History reports address bar overlap/hidden states and raw-coordinate fallback. | Map taps and address search set coordinates and reverse-geocode the address; current location is requested only after the user taps its control. If Photon cannot resolve a point, the form shows coordinate text as a fallback. |
| Human-readable address | Shows a place name/address instead of exposing raw latitude/longitude to users. | Event schema includes address; address components and reverse geocoding are present. | Photon reverse geocoding is used for map taps and device location. The coordinate fallback remains visible when no address is returned. |
| Visibility choice | Sets whether an event is public, unlisted, or friends-only. | Event schema/form contain all three values and helper text. | Public, unlisted, and friends-only rules exist. Unlisted events are never on any map, including the owner's (ADR 0007, confirmed). |
| Attendance mode | Lets the host decide whether attendance is open or requires approval. | Form supports `open` and `approval`; attendance UI supports requests. | Create and attendance APIs support both modes. |
| Invite friends by tags | Lets a host select private tags to invite matching friends to a friends-only event. | FriendTag and create form UI are present. | Create accepts invited friend tags. `VisibleTo` shows the event to friends who have one of those tags (ADR 0011). |
| Cover photo | Adds a representative image for the event and its cards. | Form uploads a cover using Base44 file storage. | Cover media workflow is not complete. |
| Create versus edit | Creates a new event or lets only its owner edit an existing event using prefilled values. | CreateEvent supports edit mode and owner check; EventDetail links to it. | Creation exists; edit/update route is not implemented. |
| Input validation | Prevents incomplete or contradictory event data, such as past starts or end before start. | Validation utilities exist, including the 7-day cap. | Server validates fields, time range and 7-day cap. |
| Explicit submit | Ensures only the Create Event action saves the event; changing the date/time does not submit it. | Base44 conversation explicitly reports accidental create-on-date-selection and says a fix was made; source has a form submit flow. | Create action submits through the API. |

## C. Event Detail

**Purpose:** Give an eligible viewer the event information and actions appropriate to their relationship with the event.

| Feature name | What it represents | Base44 source | Rebuild |
|---|---|---|---|
| Event information | Shows event title, description, place/address, date/time, tags, cover, and status. | `src/pages/EventDetail.jsx`. | Detail route reads and shows core event fields; map pins and Discover/My Events cards link to it. Cover media, reactions, and albums are still absent from the rebuild. |
| Audience-aware access | Shows live public details broadly, private details only to the allowed audience, and past details/albums only to owner or attendees. | Client-side `eventValidation.jsx` and page logic contain these rules. The old user reported a guessed event ID could expose private events, so client rules were not sufficient evidence of security. | Server-side event visibility is implemented for existing event types. Rules are documented in ADR 0007. |
| Attend / request to attend | Lets a user join an open event or request entry when host approval is required. | Attendance manager and detail controls are present. | Join/request, owner approve/reject, own status, and cancel APIs/UI exist. |
| Cancel attendance | Lets an attendee withdraw before the event ends and updates counts/access. | EventDetail removes the attendance record in its mutation. | Cancellation API exists; rejoin behavior remains conservative/open. |
| Interested / planning to attend | A soft, reversible signal of intent that is not attendance and grants no private access. | `EventInterest` schema and detail controls exist. | Not implemented. |
| Attendance and friend context | Shows attendance totals and, according to the final privacy rule, possibly friend identities/counts. | Counts and `FriendAttendees` are present. The transcript has both “no public identities” and later avatar/name requests. | Attendee count exists; friend identities do not. Product decision is open. |
| Post-start reactions | Lets owner/attendees respond with a preset reaction after an event begins, displayed as aggregate counts, without comments. | `EventReaction` entity and detail UI exist. | Not implemented. |
| Owner edit/delete | Lets the event owner correct details or remove an event, with edit disabled after the event ends and deletion confirmation. | EventDetail menu and CreateEvent edit mode exist. | Edit/delete event APIs are not implemented. |
| Share event | Gives the user a way to share the event or its invitation link with the intended audience. | EventDetail has share behavior; event has a share token. | Direct shared read exists for live unlisted events; fuller UI/sharing is limited. |
| Translate event text | Offers optional, on-demand translation while leaving authored text unchanged by default. | EventDetail includes language/translate controls. | Not implemented. |
| Report event | Lets a signed-in user report abusive, spam, fake/misleading, or unsafe event content to moderators. | `ReportModal.jsx` and Report schema. | Report API and moderator queue are not implemented. |
| Visibility and status cues | Explains who can see the event, whether it is happening now, and whether attendance is required. | Detail UI includes status and visibility information. | Core visibility/status shown; refinements remain. |

## D. Event Photos / Album (Event Detail feature)

**Purpose:** Give the host and eligible attendees a shared place for photos from the gathering.

| Feature name | What it represents | Base44 source | Rebuild |
|---|---|---|---|
| Private event gallery | Displays photos associated with one event to its permitted audience. | `PhotoGallery.jsx` reads EventPhoto records. | No album/photo API or protected storage flow yet. |
| Upload event photo | Allows owner or attendee to add a photo starting two hours before the event and after it begins/ends. | UI checks owner/attending and two-hour window, then uploads to Base44 storage. Server enforcement is not established by the ZIP. | Not implemented. |
| Delete event photo | Allows the owner to delete any album image and an attendee to delete their own. | PhotoGallery contains delete UI and ownership checks. | Not implemented. |
| Full-screen viewing | Lets participants inspect an image in a larger/lightbox view. | Requested in conversation; source includes gallery UI. Runtime behavior not validated. | Not implemented. |
| Photo report | Lets a signed-in user report an inappropriate or unsafe image. | ReportModal accepts photo targets. | Not implemented. |

## E. My Events

**Purpose:** Let a signed-in user return to events they attend and their past event albums.

| Feature name | What it represents | Base44 source | Rebuild |
|---|---|---|---|
| Upcoming/ongoing events | Lists events where the user is attending and the event has not ended. | `src/pages/MyEvents.jsx` separates current/upcoming items. | New authenticated `/v1/events/mine` route and Upcoming list are drafted; includes events created, attending, or with an active request. Runtime validation pending. |
| Past attended events | Keeps past events the user attended accessible for event details and albums. | Page separates past events; detail rules allow owner/attending after event end. | New Past list and API inclusion for owned/attended events are drafted. Albums remain unimplemented; runtime validation pending. |
| Event summary cards | Shows cover or placeholder plus schedule, address, attendee/photo indicators. | EventCard/MyEvents UI includes summary cues; history requested image placeholders and counts. | Cards show title, time, address, description, main tag, and attendee count; cover/photos remain unimplemented. Runtime validation pending. |
| Empty state | Explains that attended or created events will appear here and offers a way back to discovery. | Empty-state copy exists in the source/history. | Upcoming/Past empty states and Create Event shortcut are drafted in English and Brazilian Portuguese. Runtime validation pending. |

## F. Friends

**Purpose:** Support private invitations and friend-related event context without creating a general social network.

| Feature name | What it represents | Base44 source | Rebuild |
|---|---|---|---|
| Invite link | Gives a user a link they can share so another person can accept a friendship. | `src/pages/Friends.jsx` creates/copies a link. | Opaque 128-bit token, stored as a SHA-256 hash, one active link per user, with rotate (ADR 0011). |
| Mutual friendship acceptance | Creates the relationship for both people after the recipient accepts. | `AcceptFriend.jsx` writes reciprocal Friend rows. | Accepting the link inserts one unordered friendship. Accepting again is idempotent. |
| Friends list | Shows accepted friends with display name and photo. | Friends page queries friend rows and users. | The list returns display name only, not email. Profile photos are not implemented. |
| Private friend tags | Lets a user privately label their own friends (for example family or work) to simplify invitations. Other users cannot see the owner's tags. | FriendTag entity and Friends UI are present. | Tags are normalised, limited, and returned only to the person who set them. |
| Remove friend | Lets a user end the relationship and stop using it for future invitation/attendance context. | Friends page has remove mutation. | Remove deletes the friendship both ways and the remover's tags. Access drops on the next read. |
| Invite by tag | Selects one or more private tags during friends-only event creation and invites matching friends. | CreateEvent and FriendTag schema support this flow. | The event stores the invited tags. Friends without a matching tag cannot see it. |
| Friend attendance | Shows which friends are attending or a count, subject to the attendee privacy decision. | FriendAttendees component; transcript contains conflicting privacy expectations. | Not implemented. |
| No broad social graph | Excludes global friend search, suggestions, nearby people, followers, public profiles, chat, and a social feed from the initial purpose. | Explicit Base44 conversation non-goals. | Product direction remains event-centered. |

## G. Accept Friend

**Purpose:** Turn an invitation link into a confirmed mutual friend relationship.

| Feature name | What it represents | Base44 source | Rebuild |
|---|---|---|---|
| Invitation landing | Identifies the person who invited the visitor and prompts login when needed. | `src/pages/AcceptFriend.jsx`. | A signed-in user sees the inviter's display name and confirms. Anonymous callers get 401. |
| Accept friendship | Adds both sides of the friend relationship after confirmation. | Reciprocal bulk-create mutation is present. | Accept inserts the mutual row. Accepting again is idempotent. |
| Self-invite protection | Prevents a user from accepting their own invite link. | Page has an explicit check. | Accepting your own token returns 409 and does not insert a row. |
| Completion state | Confirms the friendship and links to Friends. | Completion screen exists. | The accept screen confirms and links back to Friends. |

## H. Profile

**Purpose:** Let a signed-in user manage the limited identity and language settings needed by Happengo.

| Feature name | What it represents | Base44 source | Rebuild |
|---|---|---|---|
| Profile identity | Shows the user's display name and current profile photo. | `src/pages/Profile.jsx`. | Profile tab exists, but full profile management remains incomplete. |
| Custom profile photo | Lets a user upload a preferred photo. | Uses Base44 file upload and updates profile. | Not implemented. |
| Reset provider photo | Restores the profile image from Google identity. | Reset action exists. | Not implemented. |
| Language preference | Uses English or Brazilian Portuguese, detects device/browser language, and offers a manual setting. | LanguageProvider and Profile controls exist. | App has EN/PT-BR localization foundation; profile preference experience is incomplete. |
| Sign in/out | Authenticates users for actions requiring an account, while allowing public browsing. | Base44 auth controls/page flows exist. | Auth0 is chosen (ADR 0005). The client is still standard OIDC. No tenant is configured. The public demo uses a fake signed-in user. |

## I. OAuth Consent (platform support page)

**Purpose:** Show an external integration which permissions it is requesting and let the user approve or deny them. This is a Base44 platform/integration page, not a core Happengo use case.

| Feature name | What it represents | Base44 source | Rebuild |
|---|---|---|---|
| Permission summary | Explains the records and operations an OAuth client is asking to use. | `src/pages/OAuthConsent.jsx`. | Not part of the current end-user rebuild scope. |
| Approve/deny consent | Records a user's decision about the requested integration access. | Consent page handles decision submission and errors. | Not implemented/needed for current user journeys. |

## J. Incident awareness (new product area; no Base44 page found)

**Purpose:** Let people report and understand notable situations in their area, including when reliable information is not yet easy to find elsewhere.

| Feature name | What it represents | Evidence/status |
|---|---|---|
| Quick incident report | Creates a time- and location-based observation, such as a fire or collision, with a clear category and description. | Owner's current product goal. No incident-specific entity/page/flow was identified in the Base44 ZIP. | Incident API and app form support fire, traffic collision, and other; signed-in reporting has a five-per-day limit. |
| Current-state updates | Lets nearby users say whether an incident is still present or no longer present. | Product goal. Keep separate from abuse reports. Not present in Base44 ZIP. | Changeable still-there/gone votes and community close rules are in the API and incident detail. |
| Source and confidence context | Distinguishes an individual observation, multiple community reports, moderator review, and official information. | Product goal; policy and labels need design. | Ordinary users do not see reporter identity. Priority reports enter moderation review; counts and source-confidence labels remain a product/design follow-up. |
| Corrections and expiry | Allows updates/closure and removes stale situations from active discovery. | Product goal; incident lifecycle needs design. | Activity is computed on read with the accepted 2-hour freshness and 12-hour maximum windows; reporter or moderator close is supported. |
| Incident moderation | Lets moderators review abuse or risk without treating report volume as proof a report is false. | Product goal; separate moderation workflow needed. | Report API and moderator queue are implemented; three unique reports prioritize an item without automatic hiding. |
| Incident filters and detail | Shows incidents in the same map/list, with incident-specific status and actions. | Product goal; shared map and incident-specific UI need implementation. | Discover merges events and active incidents with a type selector. Pin taps open a map preview; full detail has category, description, address, report age, community votes, and reporter close. |
| Incident photos | Adds visual evidence to an incident. | Not found in the Base44 ZIP. | Explicitly out of scope for v1 in ADR 0012; do not treat absence as a broken photo panel. |

## K. External livestream references (product goal; no Base44 page/field identified)

| Feature name | What it represents | Evidence/status |
|---|---|---|
| External live link | Lets a host or reporter attach a YouTube, Instagram, or other external stream link to an eligible event/incident. Happengo provides context and access rules but does not host video. | Owner's current product description. No clear field found in ZIP entity inventory; not implemented in rebuild. Decide which item types can carry a link. |

## L. Shared experience and safety features

| Feature name | What it represents | Base44 source | Rebuild |
|---|---|---|---|
| Sign-in when needed | Allows anonymous discovery and requires a signed-in user for actions such as creating, attending, uploading, managing friends, or reporting. | Base44 auth gates in pages. | Auth0 is chosen. Live tenant setup is still pending. The Pages demo does not sign in to Auth0. |
| Helpful loading, empty, and error states | Explains what is happening and how to recover without technical wording. | Repeatedly requested and some components/copy exist. | Loading/error states exist for Discover; not all pages are built. |
| English and Brazilian Portuguese | Localizes navigation, controls, dates, and errors while retaining authored event content. | LanguageProvider and formatting utilities. | EN/PT-BR foundation exists. |
| Rate limits | Restricts repeated event creation, photo uploads, or reports to reduce spam and abuse. | `rateLimits.jsx`; exact historical limits changed across prompts. | Some API rate limiting exists; align per-action policy when those APIs are built. |
| Abuse reports | Sends reports about event/photo content to moderators using predefined reasons. | Report schema/modal; historical request says admin-only and no owner notification. | Report API/admin review flow is absent. |
| No text-comments/social feed | Keeps event interaction focused on attendance, intent, reactions, and photos without creating a broad conversation feed. | Explicit historical non-goal. | Remains product direction. |

## Screenshot review findings

I visually reviewed all 15 PNG files in the shared `Photos` folder. They help confirm the intended screen composition and reveal a specific address-display defect in sample data. They are snapshots, so they do not prove the flow works in a live app or that a current build matches them.

| Screenshot evidence | What it shows | Product significance |
|---|---|---|
| `Main_MapView.png`, `Main_MapView_With_Event.png` | Full-screen muted map; search at the top; Map/List, Filter, and Create Event controls; contextual event count; bottom navigation for Discover, My Events, Friends, Profile; event marker when an event exists; Portuguese empty-state copy. The live event pin has a colored outline/aura. | Confirms a map-first shell with direct access to the four main areas and a calm basemap. Current ZIP code ties an outline color to the first tag and pulses a separate ring while live; the owner's target is for primary type to color the pin and the live aura to remain a separate cue. |
| `Main_List_View_With_Event.png` | Desktop split view keeps map on the left and event list/card on the right. The card shows cover, title, time, address, attendee count, “Now” state, and View Event. | List mode is intended as a companion to the map, not a replacement for geographic context. |
| `filters.png` | Side panel with tag chips and result counts, “Happening Now,” date range, Apply Filters, and close control. | Confirms lightweight filters and explicit apply behavior. Clear all is requested in the chat and present in source, though not visible in this particular screenshot. |
| `Create_Event.png` | Form and location map side by side; title, description, date/time, cover upload, tags, visibility, attendance mode, helper text, and explicit Create Event button. | Establishes the expected event-creation information and separates location picking from form fields. |
| `Create_Event_Date_Selection.png`, `Create_Event_Date_Selection_Starts_Now.png` | Date picker supports “Schedule for later” or “Start now”; later scheduling has a multi-day checkbox and start/end time; “Start now” offers 30-minute, 1-, 2-, 4-hour, and custom duration options. | Clarifies the historical scheduling UX. The screenshots show multi-day support, reinforcing the unresolved 24-hour versus 7-day product decision. |
| `create_event_friends_only_tag_selection.png` | Friends-only visibility reveals progressive “Invite Friends by Tag” controls. | Confirms tag-based invitation is part of the intended create flow, not a separate social feature. |
| `Event_Detail.png`, `Event_Detail_Pt_2.png` | Event cover, tags, description, happening-now label, translation/share/more controls, date/time, human-readable address with Open in Maps, attendee count, attending state, post-event reactions, and album/photo upload. The second screenshot uses Brazilian Portuguese UI. | Confirms that event detail combines logistics, attendance, feedback, and participant memories, with EN/PT-BR presentation. |
| `my_events_list.png`, `my_events_list_past.png` | Upcoming and Past tabs with event cards; cards show cover or gradient placeholder, title, state, description, location, time, attendee/photo counts, and tags. | Confirms that past memories remain accessible from My Events and image-less cards have a placeholder. |
| `friends.png` | Invite link with Copy action, accepted friend card, Remove action, and editable private tags labeled “only you can see.” | Confirms that friend management is for invitations and the user's own private grouping. The screenshot also displays the friend's email, a detail to reconsider against data-minimization goals. |
| `profile.png` | User identity, custom photo upload, and language selector set to Português (Brasil). | Confirms profile photo and language controls as visible product features. |
| `serch_address.png` | Search suggestions distinguish similarly named places across countries/regions; the typed query is “santa luzia.” | Confirms worldwide place search and the need to distinguish ambiguous results clearly. |

### Screenshot discrepancy to fix or validate

In `my_events_list_past.png`, several past-event cards show a raw coordinate such as `59.4105, 24.6656` instead of a human-readable address, while other cards show an address. This conflicts with the historical requirement to show an address rather than coordinates. Treat it as a screenshot-observed issue in the Base44 version and preserve the address-only requirement in the rebuild.

## M. Decisions that affect multiple features

These must be resolved before behavior is treated as final:

1. **Unlisted visibility (decided):** ADR 0007 stands. Unlisted events never appear on any map, including the owner's. A share link creates no persisted grant and no attendance. There is no `invited` status. The older Base44 chat rule is historical only.
2. **Attendee identity:** older request says counts only/no public identities; later history requests friend avatars/names; the current owner says “show who is attending.” Decide whether names are public, friends-only, or counts-only.
3. **Maximum duration:** Base44 and rebuild allow seven days; current owner has proposed 24 hours for an initial release.
4. **Private lifecycle:** decide who can find, attend, view past details, upload, delete, and retain photos after invitations/friendships change.
5. **Incident semantics:** decide categories, source/confidence labels, community freshness signals, official confirmation, correction, expiry, and moderator handling.
6. **Livestream references:** decide whether links can be attached to incidents, scheduled events, or both, and how private-event links are access-controlled.
7. **Incident tag set:** decide which predefined tag choices should be available for incident reports (for example, whether the shared list needs Fire or Traffic Collision). For existing event creation, the first selected existing tag already serves as the main type; no additional type-vs-tag decision is needed.

## N. Suggested page-by-page product map

For planning, the user-facing navigation can be understood as:

- **Discover:** map/list for incidents, public events, and eligible private events; filters and location search.
- **Create:** choose the item type, then enter only the information relevant to that type.
- **Item detail:** incident status and updates; public event attendance; private gathering invitations and album.
- **My Events:** items the user hosts or attends, including past event memories where permitted.
- **Friends:** invitation relationships and private tags used for event invitations and friend context.
- **Profile:** account, language, and basic identity preferences.
- **Moderation (role-gated):** review abuse reports and, separately, incident trust/escalation actions.

The existing Base44 pages are evidence for the event/friends/photo experience, not a final requirement to copy every old screen. Incident reporting and moderation add new product flows that were not present in the Base44 page list.

## Source scope

Page inventory is based on `happen-go-main/src/pages/` and key shared components in the supplied Base44 ZIP, plus the saved Base44 conversation and the current product description. All 15 PNG screenshots in the shared Photos folder were visually reviewed. The published app URL from the saved conversation is [happen-go.base44.app](https://happen-go.base44.app), but it was inaccessible from this workspace during review. The rebuild status is based on the repository state and handoff notes. This is a source and screenshot review, not an end-to-end runtime test. A source file, screenshot, or Base44 AI completion statement does not prove successful or secure behavior.
