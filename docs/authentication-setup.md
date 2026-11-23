# Auth0 client setup

## Status

Auth0 is the selected OIDC provider for the initial project. The client-side authorization-code flow with PKCE and backend JWT validation are implemented. No Auth0 tenant, applications, API, social connections, or callback allowlists have been created/configured yet, so live sign-in is not verified. The app remains safe to build with blank local values.

The owner selected Auth0 because it is a straightforward starting point and its current Free plan is listed at $0 for up to 25,000 monthly active users. Start with the provided Auth0 domain; a custom domain is unnecessary for the initial release. See [Auth0 pricing](https://auth0.com/pricing) and [ADR 0005](adr/0005-authentication.md).

## Auth0 dashboard setup (pending)

When the owner is ready to configure the account:

1. Create an Auth0 tenant and note its domain, such as `example.eu.auth0.com`.
2. Register public native and web applications as needed. The app uses authorization code + PKCE; do not add a client secret to the Expo app.
3. Create an Auth0 API and use its **Identifier** as `EXPO_PUBLIC_OIDC_API_AUDIENCE`.
4. Add the exact native callback `happengo://auth/callback` and local/production web callbacks ending in `/auth/callback` to the appropriate allowlists. Also configure allowed logout URLs and web origins for the web app.
5. Configure Google and Apple social connections only when those sign-in methods are needed. Apple sign-in requires an Apple Developer account and its provider credentials.
6. Put the tenant domain, client IDs, API identifier, and callback URIs in an ignored local env file based on `apps/mobile/.env.example`.

Do not commit tenant secrets or credentials. All `EXPO_PUBLIC_*` values are embedded as public client configuration; no client secret belongs in them. Keep any provider credentials for social connections in Auth0's dashboard.

## Client and API behavior

- `expo-auth-session` performs discovery, authorization request creation, state/PKCE validation and code exchange. The app never embeds a client secret.
- `EXPO_PUBLIC_OIDC_ISSUER` is the Auth0 issuer URL with a trailing slash, for example `https://example.eu.auth0.com/`.
- `EXPO_PUBLIC_OIDC_CLIENT_ID` configures the native public client. A separate `EXPO_PUBLIC_OIDC_CLIENT_ID_WEB` can configure the web app.
- `EXPO_PUBLIC_OIDC_API_AUDIENCE` is the Auth0 API Identifier. `EXPO_PUBLIC_OIDC_API_SCOPE` is optional and only needed if the API defines scopes.
- Access tokens stay in memory. Native refresh tokens use `expo-secure-store`. Web refresh tokens stay in memory and are never written to `localStorage`; a browser reload therefore requires a new sign-in.
- The API validates access-token signature, issuer, audience and expiry. The client does not treat an ID token as an API access token.
- Sign-out clears local tokens. It does not revoke the Auth0 browser session.

## Redirect and development build

The native scheme is `happengo`; the default native callback is `happengo://auth/callback`. The web callback uses the current origin plus `/auth/callback`. Redirect URIs must match the registered values exactly.

Exercise native OAuth in a custom Expo development build, not Expo Go, because the callback scheme must be compiled into the app. See [Expo AuthSession](https://docs.expo.dev/versions/v58.0.0/sdk/auth-session/), [Expo OAuth/OIDC guide](https://docs.expo.dev/guides/authentication/), and [Auth0 PKCE flow](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-pkce/add-login-using-the-authorization-code-flow-with-pkce).

## Not yet verified

- Auth0 discovery, browser sign-in, callbacks, code exchange, refresh, and sign-out have not been exercised against a configured tenant.
- Protected API access and real authenticated event creation need a configured Auth0 API audience and a development build.
- A durable web refresh-token session is intentionally not implemented; the ADR rules out `localStorage` and leaves the replacement open.
