# 0005. Authentication

- Status: Accepted
- Date: 2026-11-23

## Context

Anyone can open the map and read public events that have not ended. Creating an event, attending, photos, friends, reports, and profile changes require a signed-in user. The product asks for Google sign-in, and an iOS app needs Apple sign-in. The previous app redirected to a hosted login and kept an access token in `localStorage`. The API should survive a change of vendor.

Microsoft Entra External ID and Auth0 were both considered. Entra External ID has a larger core free tier and sits next to the Azure bill. Auth0 has the simpler setup for a first project and a native Apple sign-in path. Brenner chose on 2026-11-23.

## Decision

Use Auth0 as the managed OIDC provider, with Google and Apple as social connections. Entra External ID remains the considered alternative and was not selected. No Auth0 tenant, application, API, or secret is created by this decision.

The Expo client uses the authorization code flow with PKCE. It sends the API audience as the OIDC `audience` parameter, which is what Auth0 requires for an access token. On iOS and Android the refresh token is stored in `expo-secure-store`. On web the refresh token is never written to `localStorage`.

The API stays IdP-agnostic. It uses ASP.NET Core JwtBearer, takes `Authority` and `Audience` from configuration, and validates signatures against the provider's JWKS. A user row is found or created by the pair `(issuer, sub)` ([ADR 0003](0003-data-model.md)). Nothing in the API names Auth0.

Public discovery and public event reads accept anonymous callers. Every other route requires a bearer access token.

## Consequences

- Moving to Entra External ID later is configuration and app registration, plus a user migration, because identity is keyed by `(iss, sub)`.
- Google and Apple are connections on Auth0. The API does not verify Google or Apple tokens itself.
- Tests inject a test principal. They do not call Auth0.
- The public GitHub Pages demo does not use Auth0. It signs in a fake demo user in the browser and stores nothing.

## Open

- The Auth0 tenant, application registrations, API identifier, social connections, and callback allowlists. None of these exist yet.
- Where the web client keeps the refresh token. `localStorage` is ruled out. The replacement is open.
