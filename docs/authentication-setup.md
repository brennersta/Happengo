# OIDC client setup

## Status

The identity provider is still Brenner's decision. [ADR 0005](adr/0005-authentication.md) is Proposed: Microsoft Entra External ID is the recorded default and Auth0 is the recorded fallback. This client does not choose one. It speaks ordinary OIDC: discovery, authorization code with PKCE, and a bearer access token for the API audience.

No tenant, application registration, API identifier, social connection, or callback allowlist has been created. Live sign-in is not verified. Blank local values are safe; sign-in stays disabled until issuer, client id, and API audience are set.

## What either provider must supply

1. An issuer URL that publishes OIDC discovery.
2. A public native client and, if the web app is registered separately, a public web client. Do not put a client secret in the Expo app.
3. An API audience that matches `Authentication:Audience` on the API. Some providers, including Auth0, expect that value as an `audience` authorize parameter. Others, including Entra External ID, usually request the API with a scope such as `api://<app-id>/access_as_user`. Set `EXPO_PUBLIC_OIDC_API_AUDIENCE` to the audience the API validates. Set `EXPO_PUBLIC_OIDC_API_SCOPE` when the provider requires an API scope. The client sends `audience` only when the audience variable is set; it does not hard-code a vendor host.
4. Exact callback allowlists: native `happengo://auth/callback`, and web callbacks ending in `/auth/callback`. Also configure logout URLs and web origins for the web app.
5. Google and Apple connections only when those sign-in methods are needed. Apple sign-in needs an Apple Developer account.

Do not commit tenant secrets. Every `EXPO_PUBLIC_*` value is public client configuration.

## Client and API behavior

- `expo-auth-session` performs discovery, the authorization request, state/PKCE checks, and the code exchange.
- Access tokens stay in memory. Native refresh tokens use `expo-secure-store`. Web refresh tokens stay in memory and are never written to `localStorage`, so a browser reload requires a new sign-in. ADR 0005 leaves the durable web store open.
- The API validates signature, issuer, audience, and expiry against the configured authority. It does not name Entra or Auth0. The client does not send an ID token as the API access token.
- Sign-out clears local tokens. It does not revoke the provider's browser session.

## Redirect and development build

The native scheme is `happengo`. The web callback is the current origin plus `/auth/callback`. Redirect URIs must match the registered values exactly.

Exercise native OAuth in a custom Expo development build, not Expo Go, because the callback scheme is compiled into the app. See [Expo AuthSession](https://docs.expo.dev/versions/v58.0.0/sdk/auth-session/) and the [Expo OAuth/OIDC guide](https://docs.expo.dev/guides/authentication/).

## Not yet verified

- Discovery, browser sign-in, callbacks, code exchange, refresh, and sign-out have not been exercised against a configured issuer.
- Real authenticated event creation needs that issuer and a development build.
- A durable web refresh-token session is intentionally not implemented.

## Flag from the unvalidated draft

The Codex draft edited ADR 0005 to Accepted and named Auth0 as the chosen provider, including an Auth0-only setup guide and an architecture diagram that showed only Auth0. Those edits presumed a decision Brenner has not made. This note and ADR 0005 put the choice back to Proposed. The authorize `audience` parameter remains, because the draft required an API audience before sign-in; it is configuration, not a vendor selection. Confirm with the chosen provider whether that parameter should be sent.
