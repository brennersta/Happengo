# 0005. Authentication

- Status: Proposed
- Date: 2026-11-16

## Context

Anyone can open the map and read public events that have not ended. Creating an event, attending, photos, friends, reports, and profile changes require a signed-in user. The product asks for Google sign-in, and an iOS app needs Apple sign-in. The previous app redirected to a hosted login and kept an access token in `localStorage`. The API should survive a change of vendor.

## Decision

Use a managed OIDC provider with Google and Apple as social connections.

- Default: Microsoft Entra External ID.
- Fallback: Auth0.
- Brenner picks. This ADR stays Proposed until that pick is written down.

The Expo client uses the authorization code flow with PKCE. On iOS and Android the refresh token is stored in `expo-secure-store`. On web the refresh token is never written to `localStorage`.

The API is IdP-agnostic. It uses ASP.NET Core JwtBearer, takes `Authority` and `Audience` from configuration, and validates signatures against the provider's JWKS. A user row is found or created by the pair `(issuer, sub)` ([ADR 0003](0003-data-model.md)).

Public discovery and public event reads accept anonymous callers. Every other route requires a bearer access token.

## Consequences

- Moving between Entra External ID and Auth0 is configuration and app registration, as long as both issue OIDC tokens with `iss` and `sub`.
- Google and Apple are connections on that provider. The API does not verify Google or Apple tokens itself.
- Tests inject a test principal. They do not call the live provider.

## Open

- The provider itself (this ADR).
- Where the web client keeps the refresh token. `localStorage` is ruled out. The replacement is open.
