# Auth0 client setup

## Status

Brenner chose Auth0 on 2026-11-23. [ADR 0005](adr/0005-authentication.md) is Accepted. Entra External ID was considered and was not selected. It remains a possible later alternative if the accounts are migrated.

No Auth0 tenant, application, API, social connection, or callback allowlist has been created. Live sign-in is not verified. Do not invent credentials. Blank local values are safe, and sign-in stays disabled until the issuer, client id, and API audience are set.

The public demo at `https://brennersta.github.io/Happengo/` does not call Auth0. It uses in-browser sample data and a fake signed-in demo user. Nothing from that demo is saved.

## What to configure later

1. Create an Auth0 tenant and note its issuer URL.
2. Register public native and web applications. The app uses authorization code with PKCE. Do not put a client secret in the Expo app.
3. Create an Auth0 API. Its identifier is `EXPO_PUBLIC_OIDC_API_AUDIENCE` and `Authentication:Audience`. The client sends that value as the OIDC `audience` parameter, which Auth0 requires.
4. Add the native callback `happengo://auth/callback` and the web callbacks that end in `/auth/callback`. Also set logout URLs and web origins.
5. Add Google and Apple connections only when those sign-in methods are needed. Apple needs an Apple Developer account.

`EXPO_PUBLIC_OIDC_API_SCOPE` stays optional. Every `EXPO_PUBLIC_*` value is public client configuration.

## Client and API behavior

- `expo-auth-session` performs discovery, the authorization request, state and PKCE checks, and the code exchange.
- Access tokens stay in memory. Native refresh tokens use `expo-secure-store`. Web refresh tokens stay in memory and are never written to `localStorage`, so a browser reload requires a new sign-in. ADR 0005 leaves the durable web store open.
- The API validates signature, issuer, audience, and expiry. It does not name Auth0. The client does not send an ID token as the API access token.
- Sign-out clears local tokens. It does not revoke the Auth0 browser session.

## Redirect and development build

The native scheme is `happengo`. The web callback is the current origin plus `/auth/callback`. Redirect URIs must match the registered values exactly.

Exercise native OAuth in a custom Expo development build, not Expo Go, because the callback scheme is compiled into the app. See [Expo AuthSession](https://docs.expo.dev/versions/v58.0.0/sdk/auth-session/) and [Auth0's PKCE guide](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-pkce/add-login-using-the-authorization-code-flow-with-pkce).

## Not yet verified

- Discovery, browser sign-in, callbacks, code exchange, refresh, and sign-out have not been exercised against a tenant.
- Real authenticated event creation needs that tenant and a development build.
- A durable web refresh-token session is intentionally not implemented.
