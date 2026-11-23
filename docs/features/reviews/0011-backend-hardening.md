# Review 0008: Backend hardening
**Date:** 2026-11-23
**Branch:** codex/backend-hardening
**Scope:** forwarded-header trust/rate-limit IPs, Staging startup guards, and unlisted share-link rotation.
## Changes
- Forwarded headers are disabled by default. When enabled, only configured trusted IPs/networks are honored. Invalid trust entries fail startup; outside Development, enabling forwarding without any trusted proxy/network fails startup.
- The existing production configuration guard now applies to both Staging and Production.
- Added POST /v1/events/{eventId}/share-link. It is scoped to the owner of an unlisted event, returns a one-time plaintext token, stores only its SHA-256 hash, and revokes the prior link. It does not write attendance or event invites. Unauthorized and not-found responses are ProblemDetails.
- No database schema change was required; no migration was added or modified.
- Updated generated OpenAPI and TypeScript API client.
## Verification
- ShareLinkRotationTests: 2 passed.
- OpenAPI export test in update mode: 1 passed; then the full suite reran the drift assertion without update mode.
- dotnet test backend/Happengo.sln --configuration Release: 222 passed, 0 failed, 0 skipped, with Testcontainers/PostGIS.
- Exact commands and Docker version are recorded in the 2026-11-23 handoff section.
## Review boundaries
- Reviewed code and tests in the requested backend/API/docs scope. No mobile files changed.
- No deployment, provisioning, Azure, Terraform, or external service actions were performed.
- Targeted `dotnet format whitespace ... --verify-no-changes --no-restore --include <changed C# files>` passed. Full-solution format verification was attempted and reported checkout-wide CRLF/LF differences; see the handoff for the exact command and outcome.
