# Review 0024: Map and incident UX

## Changes

- Constrained and centered the create-kind choice screen to a readable desktop width.
- Incident and event location pickers now request device location only after a button tap. Tapping the map or using device location reverse-geocodes the point through Photon; when no address is returned, the coordinates remain visible as a fallback address.
- Discover pin taps now show a compact event/incident preview with a separate action to open full details. Removed the generic MapLibre text popup so web and native use the same preview experience.
- Added English and Brazilian Portuguese labels for location actions, address lookup status, and closing a map preview.
- Updated the feature catalog and Grok handoff to distinguish implemented incident detail from deferred media features.

## Product scope clarified

- Incident photos are explicitly out of scope for v1 in ADR 0012. The incident detail's lack of photos is intentional.
- Event reactions and photo albums appear in the Base44 screenshots, but the rebuilt event flow still has no reaction or protected media API. The current detail screen is therefore incomplete relative to Base44; this follow-up did not add fake controls or start that feature, consistent with `GROK.md`.

## Checks run

- `pnpm --filter @happengo/mobile lint` — passed.
- `pnpm --filter @happengo/mobile typecheck` — passed.
- `pnpm --filter @happengo/mobile export:web` — passed.
- Parsed `en.json` and `pt-BR.json` with PowerShell `ConvertFrom-Json` — passed.
- Jest was not run.
