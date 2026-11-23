# 0009. Review of the event detail and My Events polish

- Branch: `cursor/detail-my-events-polish-c78e`
- Approved by Brenner on 2026-11-23

## What changed

Event detail now lists when, where, attendees, and visibility plus joining as icon rows under the description. The host row is “Hosted by you” only when `isOwner` is true. The API has no host name, cover, album, reaction, or attendee avatar, so those stay out.

My Events uses the same cards in one column below 720px, two columns from 720px, and three from 1080px. Past cards are drawn at reduced opacity. Addresses still go through `displayAddress`, so a coordinate-only string stays hidden.

New copy is in English and pt-BR. No API, backend, or dependency changes.
