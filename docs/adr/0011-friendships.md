# 0011. Friendships and the friends-only audience

- Status: Accepted
- Date: 2026-11-23

## Context

Friends-only events need a real audience. The old client enforced that in the browser, and a guessed id could open a private event. ADR 0007 already says every read goes through `VisibleTo`, and that unlisted events are never on a map. This decision fills in the friendship and the friends-only row without a second filter.

Brenner approved the Friends tab on 2026-11-23. The invite link must not carry a user id. Friend tags stay private to the person who set them. The friend list shows a display name and not an email.

## Decision

Friendship is mutual. One row stores the unordered pair. The only way to create it is a signed-in user accepting another user's invite on a confirm screen. A user cannot accept their own invite. Accepting the same invite again does not create a second row. Remove deletes that row for both people and deletes the tags the remover had set for that friend. The other person's tags of the remover are left in place, but they no longer grant access because the friendship is gone.

The invite token is an opaque random value of at least 128 bits. The database stores only its SHA-256 hash. Each user has one active invite. Rotate deletes that hash and issues a new token. The plaintext is returned once, from create or rotate, and a later read returns only whether a link is active. An unknown or malformed token is 404. Anonymous calls are 401 with ProblemDetails. A self-accept is 409.

Friend tags belong to the tagger. They are never returned to the friend or to anyone else. Tags are trimmed, compared case-insensitively, and limited to 30 characters and 20 tags per friend. The same rules apply to the tags invited on a friends-only event.

A friends-only event is visible to its owner and to the owner's friends, while it has not ended. If the event has invited friend tags, only friends the owner tagged with at least one of those tags can see it. That test is inside `VisibleTo` and nowhere else. Joining a friends-only event asks `VisibleTo` rather than copying the rule. Unlisted events stay off every map (ADR 0007). An ended friends-only event follows the existing past rule: the owner and people with Attendance `attending`.

`invitedFriendTags` is present on an event response only for the owner. Other readers, including a friend who can see the event, do not receive the tags.

## Consequences

- `GET /v1/events` and event-by-id use the same friends-only clause. Removing a friend drops access on the next read.
- The per-user `event_invites` table is not the friends-only gate.
- Display name is the privacy default for the friend list. Email is not returned. A later decision can change that.
- Profile photos, friend attendance on the map, and albums are still out of scope.

## Open

Whether the other person's tags should also be deleted on remove. This decision deletes only the remover's tags.
