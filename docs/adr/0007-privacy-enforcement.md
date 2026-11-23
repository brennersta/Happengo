# 0007. Privacy enforcement

- Status: Accepted
- Date: 2026-11-16

## Context

Visibility, the past-event lock, and album access were enforced in the old React client. A guessed event id opened a live friends-only or unlisted event. Happengo's rules are the product, and they have to hold for a direct URL and a raw blob URL. Past events stay out of public discovery. The owner can always see their own events.

## Decision

Enforcement is server-side only. The client is not a security boundary.

Every event read goes through one composable filter, `VisibleTo(viewer)`:

| Case | Rule |
|---|---|
| Public | Visible while `now < end_at` |
| Unlisted | Never on the map. Readable only by presenting the event's 128-bit `share_token` |
| Friends-only | The owner, plus the owner's friends. Invited friend tags narrow that audience ([ADR 0011](0011-friendships.md)) |
| Past | Locked to the owner and to Attendance `attending` |
| Owner | The owner always sees their own events |

The rows compose. An ended event of any visibility is readable by the owner and by `attending` only. Unlisted is never a map result. A share token reads an unlisted event that has not ended, on the direct read, and the owner does not need the token for their own event. The friends-only audience is applied only inside `VisibleTo` ([ADR 0011](0011-friendships.md)).

`Interested`, `requested`, `rejected`, and `cancelled` do not count as attending. A friendship grants friends-only access only when the mutual row exists ([ADR 0003](0003-data-model.md)). Opening a share link does not insert Attendance and does not put the event on the map.

Mutations use resource-based authorization policies: create, edit, delete, attend, approve, reject, cancel, upload, and delete photo.

Attendee identities are not a public list. A signed-in reader may see counts and up to three friends' avatars.

A table-driven test matrix is required. Minimum axes: anonymous, stranger, owner, invited friend, other friend, share-token holder; each visibility; live and ended; map query and direct read. `Interested` and non-`attending` states must fail album and past-event access.

Changes to this policy need the identity owner's CLEAR.

## Consequences

- `GET /v1/events` and event-by-id call the same filter, plus the share-token path for unlisted reads.
- Unlisted events are absent from the map for every caller, including the owner. The owner reaches them from My Events.
- Album bytes follow the same people as the past and album rules ([ADR 0008](0008-image-storage.md)).
- Soft-hide is not part of `VisibleTo` while its audience is open ([ADR 0003](0003-data-model.md)).

## Open

Ended events on the owner's Discover map. The inventory says past events never appear in discovery, and also that the owner always sees their own events on the map. Those clash for an ended event the owner created. `VisibleTo` still lets the owner read it. Whether the map query includes it is open.
