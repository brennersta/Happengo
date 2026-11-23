# Happengo product vision

## One-sentence idea

Happengo is a map-based way to see what is happening nearby, whether that is an urgent local situation, something to do, or a gathering whose attendees want a shared place for updates and photos.

The map and the combination of place, time, and audience are the common thread. The owner's direction is one app and one map with filters that let each person decide which kinds of activity to see. Keep a shared map/list shell; use item-specific fields and actions where they matter.

## The use cases the owner described

### 1. Local incidents and eyewitness reports

Someone sees a fire, collision, or other notable situation and can share a timely, location-based observation when official information is not yet available. Nearby people can add useful updates. Reports need timestamps and clear source/status context so an unverified eyewitness observation is not mistaken for confirmed information.

This could feel somewhat like Waze's local reporting, but for a wider range of nearby situations. It is not intended to replace emergency services.

### 2. Discover things to do, including while visiting a city

A resident or visitor can see what is happening or planned nearby on a chosen day and decide where to go. Hosts can publish public events such as parties and community gatherings. Map and list discovery should make location and time central.

### 3. Private gatherings and shared memories

A family or other gathering can have a private attendee space for updates and photos. People who attended can share the album without needing to belong to a long-lived WhatsApp group. Access should follow the gathering's audience and privacy rules.

### 4. Links to live coverage

An event or incident can point to a live stream hosted elsewhere, such as a YouTube or Instagram stream. The initial product does not need to host video; it can link to the external stream with appropriate context and access controls.

## Product shape and architectural implications

The current owned-code rebuild mainly implements the foundation for the second use case: map discovery and creation of scheduled social events, with visibility and attendance rules. The other use cases are product goals, not implemented capabilities.

Do not assume that an incident report is just a scheduled social event with a different title. Incidents may need separate fields and lifecycle rules, such as observation time, report source, confidence/verification state, update/closure state, and an expiry policy. Define how corrections and conflicting reports work before broad public incident reporting is built.

Private gathering albums also have their own access lifecycle and media requirements. External stream links should remain references to third-party content in an early version rather than turning Happengo into a streaming platform.

The map does not have to split into separate products because event types differ. A filterable map can show incident reports, scheduled public events, and private gatherings to the eligible audience. Within that single map experience, an incident can carry report time and current status, a party can carry its start/end time and attendance, and a private gathering can expose its album only to participants. Shared product surface, type-aware details and permissions.

The saved Base44 AI conversation and Base44 ZIP have now been reviewed at source level. The ZIP contains event tags/date filters, map/list code, attendance flows, friend invite/tag entities and UI, photo gallery code, and a content-abuse report flow. It does not demonstrate incident reporting or an incident freshness/corroboration lifecycle. Client-side checks in the Base44 source do not prove hosted backend or media-storage enforcement. The Base44 AI transcript contains repeated “fixed/implemented” claims followed by owner reports of persistent map, mobile, address, and event-date bugs; those claims are not validation. The detailed evidence inventory and conflicts are in [product features](product-features.md). The owned-code rebuild still lacks Discover filters, friend/invitation flows, albums/media, incident workflows, and report/review routes.

## One app, shared map, and small-city launch

The owner's direction is to bring the three main uses together in one app and one map. A person looking at the map gives each item context: an incident to know about, a public event to attend, or a private gathering they belong to. This is a deliberate product choice; do not recommend splitting these into separate apps just because the underlying actions differ.

The owner is considering starting in a small city, inviting people to seed real local events, and personally reviewing activity while the community is small. That can reduce cold-start and moderation burden if there is enough initial participation. Keep a clear path from pre-publication review to sustainable community moderation as activity grows.

Use one consistent map/list shell, shared visual language, and user-controlled tags/filters, while letting the details and actions change by item type. For example, an incident might show observation time, update status, and corroboration; a public event might show schedule, host, attendance, and friends attending; a private gathering might show its invited audience and photo album. The person chooses what to see; the item type determines the relevant actions and access rules.

The owner says the existing Base44 app has a report mechanism. The rebuild repository has the Report concept in its data-model plan, but the report API and review workflow are not implemented yet. Reporting is a useful abuse signal, but reports alone do not establish that content is malicious or true. Early moderation should distinguish user flags from moderator review and from independent verification. Define an escalation/expiry path before volume makes manual review impractical.

## Product risks to test

- **Local usefulness depends on activity.** A quiet map gives visitors and residents little reason to return. A pilot needs enough nearby reports or events to make the chosen area feel alive.
- **A shared map still needs clear filters and item cues.** People should be able to include or hide incidents, public events, and private gatherings without losing orientation. The map can be unified while details, access and actions remain type-aware.
- **Incident information needs trust cues.** The interface should distinguish a single unverified observation from corroborated or official updates, show when it was reported, and provide a way to correct or close stale information.
- **Private media depends on reliable access control.** Family albums are valuable only if invitations and access are understandable and private by default.
- **Visitor discovery needs enough supply.** Useful recommendations depend on timely event listings in the places and dates visitors search.

## Recommended development posture

Treat the vision as one product with a shared, filterable map. Do not recommend separate apps simply because the map contains different item types. For a small-city pilot, seed real listings and consider owner-led review while volume is low. Validate whether people understand the filters, contribute, return, and trust the information. Waze is a useful precedent for low-friction location reports: its help documents reports tied to what a user sees in real time, and report visibility duration that changes with user reactions, including a “Not there” action ([Waze hazard reporting](https://support.google.com/waze/answer/13739290?hl=en), [Waze crash reporting](https://support.google.com/waze/answer/13739612?hl=en)). This supports the pattern; it does not by itself prove demand or solve broader local-report trust. Separate abusive-content flags from feedback about whether a report is still accurate, and define provenance, corrections, expiry, and escalation for incidents. Reports should inform review, not be treated as proof of maliciousness or truth.

## Status

For a concise, business-focused explanation of Happengo, see the [product description](business/product-description.md). This brief records the owner's stated product direction on 2026-11-18. It is a product source document for development planning, not authorization to deploy, spend money, or publish user content.
