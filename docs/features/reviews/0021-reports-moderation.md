# Review 0021: Reports and moderation

## Scope

- Added one report per signed-in user and target, with fixed reasons and a priority flag at three unique reporters. Reports never hide content automatically.
- Added moderator access configured by exact identity-provider subject IDs under `Moderation:ModeratorUserIds`; there is no grant-role endpoint.
- Added moderator queue, incident close and event hide endpoints. Every successful moderator action is recorded in `moderation_actions`.
- Hidden events remain visible to their owner and are excluded by the shared `VisibleTo` query for everyone else.
- Added report controls to event and incident detail, a moderator-only profile entry and review queue screen, and en/pt-BR labels. Demo API mocks include sample queue items and actions.

## Data and privacy

- Migration `ReportsModeration` adds `users.is_moderator`, `events.hidden_at`/`hide_reason`, `reports` with a unique reporter/target index, and `moderation_actions` with an actor foreign key and constrained action values.
- Report and moderation responses contain target content and reason summaries, never reporter IDs or names.
- `GET /v1/me` returns the caller's moderator status so the app can conditionally show the moderation screen. Server endpoints still enforce the role and return 404 to non-moderators.
- Moderator IDs must be configured as identity-provider `sub` values in `Moderation:ModeratorUserIds`.

## Validation

See the dated Grok handoff section for exact commands and environment constraints.
