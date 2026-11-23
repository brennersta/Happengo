# 0005. Authentication

- Status: Accepted
- Date: 2026-11-17

## Context

Anyone can open the map and read public events that have not ended. Creating an event, attending, photos, friends, reports, and profile changes require a signed-in user. The product asks for Google sign-in, and an iOS app needs Apple sign-in. The previous app redirected to a hosted login and kept an access token in `localStorage`. The API should survive a change of vendor.

## Decision

Use Auth0 as the managed OIDC provider, with Google and Apple as social connections. The owner selected Auth0 for the simpler setup and a $0 starting tier suitable for this initial project (currently up to 25,000 monthly active users). Start with Auth0's default domain; a custom domain is not needed for v1.

The Expo client uses the authorization code flow with PKCE. On iOS and Android the refresh token is stored in `expo-secure-store`. On web the refresh token is never written to `localStorage`.

The API is IdP-agnostic. It uses ASP.NET Core JwtBearer, takes `Authority` and `Audience` from configuration, and validates signatures against the provider's JWKS. A user row is found or created by the pair `(issuer, sub)` ([ADR 0003](0003-data-model.md)).

Public discovery and public event reads accept anonymous callers. Every other route requires a bearer access token.

## Consequences

- The API remains provider-agnostic. Moving to another OIDC provider requires configuration and app registrations; existing accounts may need migration because user identity is keyed by (`iss`, `sub`).
- Google and Apple are connections on that provider. The API does not verify Google or Apple tokens itself.
- Tests inject a test principal. They do not call the live provider.

## Open

- Auth0 tenant, application registrations, API identifier, social connections, and callback allowlists must be configured before live sign-in can be tested.
- Where the web client keeps the refresh token. `localStorage` is ruled out. The replacement is open.
