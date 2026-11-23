# Happengo — product description

For a page-by-page description of individual features, see the [feature catalog](feature-catalog.md).

## The idea

Happengo helps people understand what is happening around them and take part in the things that matter nearby. It brings local information, activities, and private gatherings into one place-based app, organized around a map and a matching list.

People can use Happengo to learn about a situation unfolding nearby, find something to do in a city, or share moments with the people who were part of a private gathering. These are different needs, but each depends on the same simple context: **where it is, when it is happening, and who should be able to see or join it.**

## Who it is for

- **People nearby** who want timely information about a local incident or notable situation.
- **Residents and visitors** looking for public events, activities, and places to go on a particular day.
- **Hosts and attendees** who want to organize a private gathering and share its photos with participants.
- **Communities** that want a shared view of local activity without making every interaction part of a social network.

## Three connected uses

### 1. Know what is happening nearby

A person who sees a fire, collision, or other notable situation can post a location-based observation when useful information may not yet be available elsewhere. Nearby people can add timely updates, such as whether it is still happening or appears to have ended.

Happengo should make the status and source of information clear. One person's report is an observation, not automatic confirmation. Other updates, moderator review, or an official source can add context. Reports should be correctable and should expire or close so stale information does not remain on the map. Happengo can help people become aware of a situation; it does not replace emergency services.

This use is similar in spirit to Waze's community reports, extended beyond traffic to other local situations.

### 2. Find something to do

Residents and visitors can explore public activities near a place and time they choose. This is especially useful when visiting a city and not knowing where to look for events that day. Hosts can create events with a location, schedule, description, and tags. People can see details, gauge attendance, and choose to attend or request a place when host approval is required.

Friends' attendance can help people understand which events are drawing interest from people they know, while event privacy choices determine what information is shown.

### 3. Share a private gathering

A host can invite people to a family or other private gathering. Participants get an event space for practical details and shared photos, without requiring everyone to join a permanent WhatsApp or other group chat. Access belongs to the gathering and its invited or participating audience; the private event and album should not be exposed to outsiders.

Friends and private tags are intended to make invitations easier. They support the event experience rather than turning Happengo into a broad social network.

## One product, with a map people can shape

All three uses belong in the same app and map. People can choose what they want to see using filters for type, tags, place, and time. A visitor might focus on public events; someone responding to local conditions might focus on incidents; a participant might see a private gathering they have access to.

The common map should not make every item behave alike. An incident needs a current status and source context. A public event needs its schedule and attendance options. A private gathering needs invitations and a protected album. The map and list provide a consistent way to discover items; each item has the details and actions that fit its purpose.

The creator selects from Happengo's predefined tag chips. The first tag selected is the event's main type; additional selected tags add detail. The map pin's color identifies that first tag. When an event is currently happening, a separate, subtle pulsating aura around its pin signals that it is live; the aura is shown only from the start time through the end time and does not replace the type color.

## Trust, privacy, and simplicity

- **Location and time are central.** Show useful human-readable addresses and clear dates/times, and let people search for places around the world.
- **Make information status clear.** Separate eyewitness observations, community updates, moderator review, and official information.
- **Respect the audience.** Public items can be discovered broadly; private events and photos are available only to the intended participants.
- **Keep social features purposeful.** Friends help with invitations and event context. The initial product does not need public profiles, follower counts, a social feed, text comments, or chat.
- **Make contribution straightforward.** Creating an event or sharing an observation should be quick, understandable, and reliable on mobile as well as web.
- **Keep live video lightweight.** A listing can link to an external stream such as YouTube or Instagram. Happengo does not need to host streaming in its first version.

## A practical starting point

Happengo could begin in one small city or community, where the owner can seed legitimate local events and personally review activity while participation is manageable. The pilot should test whether the map feels useful, filters make the different kinds of activity understandable, people contribute trustworthy information, and attendees return to use private albums.

The small-city approach is a launch option, not a change to the product's scope: the longer-term idea remains one product serving local awareness, event discovery, and private gathering memories.

## What Happengo is not

Happengo is not only a party-finding app, a traffic-only incident tool, or a replacement for family messaging. It is also not intended to become a general social network. Its focus is nearby activity and the people who need to know about, attend, or remember it.

## Product decisions still open

Some details need an explicit product decision before they are built: how unlisted events appear in discovery, whether public event attendees are shown by name or only through counts/friend context, and whether the first release limits events to one day. Incident categories, confirmation signals, expiry, and moderation also need to be defined. These choices do not change the core idea described above.

## Current implementation context

The Base44 export and saved conversation show that the earlier app explored event discovery, attendance, friends, private albums, and content reports. The current owned-code rebuild has begun the map, event, and attendance foundation. Local incident reporting and several social/privacy flows still need to be designed and implemented. This description states the intended product; it does not claim those capabilities are already complete.
