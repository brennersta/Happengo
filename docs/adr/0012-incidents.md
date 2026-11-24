# 0012. Public incidents

- Status: Accepted
- Date: 2026-11-24

## Context

Happengo needs a quick way for people nearby to report time-sensitive situations such as fires and traffic collisions. These reports have different privacy, lifetime, and moderation rules from planned social events.

## Decision

Incidents are a separate module and database table, not an Event subtype. Incidents are always public. Reporter identity is never returned to ordinary callers; only moderators may access it through a future moderation surface. The v1 categories are `fire`, `traffic_collision`, and `other`. Photos are out of scope for v1.

An incident is active on read while `closed_at IS NULL` and `now < min(last_confirmed_at + 2 hours, created_at + 12 hours)`. No background job expires incidents. A user's vote is either `still_there` or `gone`; each user has one changeable vote per incident. A community close occurs when gone votes exceed still-there votes and there are at least two gone votes. The reporter or a moderator may close an incident; the initial API supports reporter closure only.

A user may report at most five incidents per day. Three unique reports about an incident place it in a priority review queue; reports never automatically hide an incident. Moderator tooling and report intake are separate follow-up work.

## Consequences

- Map and detail reads may be anonymous, and list reads include active incidents only.
- The server computes activity from timestamps on each read.
- API response contracts must not expose reporter ids, names, or other identity data.
- The incident feature must not depend on the Events feature, or vice versa.
- Moderation review is a prioritized workflow, not an automated visibility decision.

## Open

Define moderator authentication and the priority review queue workflow before building moderation tools.
