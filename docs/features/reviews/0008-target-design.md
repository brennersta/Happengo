# 0008. Review of the target design and address search

- Pull request: https://github.com/brennersta/Happengo/pull/18
- Branch: `cursor/target-design-c78e`

## What changed

Discover, event detail, create, and My Events follow the saved Base44 screens on a wide web layout. Narrow web and native use the same components. The purple gradient, lavender page, white cards, and chips live in `src/theme`. Pins are teardrops in the main-tag color. The live aura and reduced-motion behaviour are unchanged.

Photon search sits in the top-bar field and on the create-event location card. ADR 0010 records Brenner's 2026-11-23 choice. The #17 filter nits are in the drawer: translated tag chips, `accessibilityState.expanded`, and an active-filter count.

Not built, because the features are not there yet: cover upload, albums, reactions, friends, a profile photo, and a date-range filter. Placeholders are gradients. No personal photos were added.

## Runtime proof

The live filter check on `c1fae62` and the local 1280×800 before/after export are written in `docs/handoff/grok-next-session.md`. Food left only Market lunch. Happening now left only Harbour choir. The stubbed search separated two Santa Luzia results by region and country.

## Code review only

Native camera movement was not opened on a device. Photon was not called on the public host during the browser check. CI tests use a stubbed fetch.
