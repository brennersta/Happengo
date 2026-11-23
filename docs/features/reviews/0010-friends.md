# 0010. Review of friendships and the Friends tab

- Pull request: https://github.com/brennersta/Happengo/pull/21
- Branch: `cursor/friends-tab-c78e`
- Approved by Brenner on 2026-11-23

## What changed

Friendship is one mutual row. The only create path is a signed-in user accepting an invite. The token is 128 random bits, stored as a SHA-256 hash, one active link per user, and rotate replaces it. An unknown token is 404. Anonymous calls are 401. You cannot friend yourself, and accepting again does not add a second row.

Friend tags are private to the tagger, case-insensitive, at most 30 characters and 20 per friend. Remove deletes the friendship both ways and the remover's tags. The friend list returns a display name, not an email.

`VisibleTo` is still the only read filter. A friends-only event is visible to the owner and the owner's friends. Invited tags narrow that to friends who have at least one of them. The tags are on the event response only for the owner. Unlisted events stay off every map (ADR 0007). ADR 0011 records the rule.

The Friends tab shows the invite link, Copy, the friend list, private tags, and Remove. Create offers Friends only and Invite Friends by Tag. The demo fetch mock has sample friends and an accept screen. The two #19 nits are in: fact rows are not labelled on a plain view, and the access row label is "Access".

## Tests

API tests: 217 passing, including the friends-only audience (stranger, friend without the tag, friend with the tag, remove, and a live event) and the invite rules. Mobile Jest covers tag normalisation. `tsc` and lint are clean.
