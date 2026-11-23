# 0004. Backend baseline

- Status: Accepted
- Date: 2026-11-16

## Context

[ADR 0002](0002-stack-and-modular-monolith.md) chooses one ASP.NET Core process on .NET 10, EF Core, and PostgreSQL/PostGIS, with feature folders and ArchUnitNET. [ADR 0003](0003-data-model.md) is the data model. [ADR 0005](0005-authentication.md) is the IdP-agnostic JWT boundary and is still Proposed. [ADR 0006](0006-geo-queries.md) is the viewport query. [ADR 0007](0007-privacy-enforcement.md) is `VisibleTo`. [ADR 0008](0008-image-storage.md) and [ADR 0009](0009-i18n.md) fix blob privacy and the shape of errors. Hosting is already decided in 0002 and [infra/README.md](../../infra/README.md). This ADR records only how that API is built, tested, and deployed.

## Decision

`backend/Happengo.sln` has one deployable, `backend/src/Happengo.Api`, and `backend/tests/Happengo.Api.Tests`. The test project is not a second service. Feature folders are Events, Attendance, Friends, Media, and Identity. Each slice keeps its endpoint, request, and handler together. The DbContext and cross-feature foreign keys live in Infrastructure. ArchUnitNET fails the build when a feature depends on another feature's non-public types. Public contracts (`AttendanceAccess`, `UserDirectory`, the tag and visibility enums, response records) are allowed.

Persistence is EF Core with Npgsql, NetTopologySuite, and the Npgsql NodaTime plugin. `location` is `geometry(Point,4326)` with a GiST index. A second GiST index on `location::geography` is created for the radius path in ADR 0006; that query is not implemented. Instants are NodaTime `Instant` values in `timestamptz`, compared in SQL to an injected `IClock`. `time_zone_id` is the IANA zone. Event status is not stored. Migrations are source-controlled, including the initial migration, and are not applied at startup. `backend/scripts/ef-bundle.sh` builds an EF migration bundle for the deploy step. `docker compose` in `backend/` runs PostGIS for local development.

The first read slice:

- `GET /v1/events?bbox=minLng,minLat,maxLng,maxLat` applies `VisibleTo` in map scope, which itself requires `end_at > now` and excludes unlisted events, and keeps points where `location && ST_MakeEnvelope(...)`. Optional `tags` keeps events that have any of the named tags. The response is capped at 500, sets `truncated` when more matched, and orders happening-now first, then `start_at`. A box that crosses the antimeridian is rejected.
- `GET /v1/events/{id}` uses the same `VisibleTo` filter.
- `GET /v1/events/shared/{token}` is the share-token path beside that filter: a live unlisted event only.

`EventTag` is the fixed 10-value enum from ADR 0003. OpenAPI emits it, `EventVisibility`, and `ApprovalMode` as string enums. The committed document is `api/openapi.json`, generated with `Microsoft.AspNetCore.OpenApi`. The test fails when it drifts. Regenerate with `backend/scripts/export-openapi.sh`.

Anonymous callers may hit those three reads. Every other route requires a bearer token. JwtBearer reads `Authority` and `Audience` from configuration and checks issuer, audience, lifetime, and signature via the provider JWKS. `MapInboundClaims` is off so the pair (`iss`, `sub`) is stored on `users`. Tests inject a test principal and do not call a live provider. Nothing names Entra or Auth0 in code.

Errors are ProblemDetails. `type` is a stable URI and is the code ADR 0009 says the client translates. The server does not localize it. The viewport is capped, not paged. Cursor pagination is not introduced until a list endpoint needs it. The built-in rate limiter, partitioned by (`iss`, `sub`) or the client IP after forwarded headers from configured proxies, is attached to the write, auth, and upload groups. Those groups have no routes yet. Product caps (create, upload, report) land with the routes.

The initial migration includes `users` (ADR 0003 profile columns; language null until a preference is stored), `events`, `event_invites`, and `attendances`. Album, interest, friendship, friend-tag, reaction, and report tables wait for their slices. Soft-hide is not part of `VisibleTo` (ADR 0003, ADR 0007).

`GET /health` is anonymous and runs a database check. CI is the `api` job in `.github/workflows/ci.yml`: restore, `dotnet format --verify-no-changes`, build, and `dotnet test`. That test run includes Testcontainers and the OpenAPI drift check. `ubuntu-latest` already provides Docker, so the workflow did not need a second file.

### Cost of the hosting in ADR 0002

Low-traffic sketch for East US, list prices, one API replica that scales to zero. Confirm in the Azure pricing calculator before budgeting.

| Piece | Basis | Low-traffic figure |
|---|---|---|
| Container Apps, consumption | [Billing](https://learn.microsoft.com/en-us/azure/container-apps/billing): 180,000 vCPU-seconds, 360,000 GiB-seconds, and 2 million requests free per subscription per month. [Retail Prices](https://prices.azure.com/api/retail/prices) for `Azure Container Apps` / `eastus` on 2026-11-16: active vCPU $0.000024/s, active memory $0.000003/GiB-s, requests $0.40 per million. | **$0** while inside the grant. Example: 0.25 vCPU and 0.5 GiB active one hour a day is 27,000 vCPU-s and 54,000 GiB-s. |
| PostgreSQL Flexible Server, Burstable B1ms | [Pricing page](https://azure.microsoft.com/en-us/pricing/details/postgresql/flexible-server/) lists B1ms as 1 vCore and 2 GiB. The static page does not include the dollar amount. [Usage.ai](https://instances.usage.ai/azure/db/Standard_B1ms) (2026-11-15, says it read the retail API) reports $0.017/hour in East US, about $12.41 for 730 hours. [Bytebase](https://www.bytebase.com/dbcost/azure-flexible/instance/B1ms/) (2026-11-16) reports from $12/month in East US. Storage was **not** re-checked here; a secondary note of $0.115/GiB-month would put 32 GiB near $4. | **Estimate: about $13–17/month** for compute plus a small data disk. This is the standing cost. ADR 0002 allows stopping the server while idle; storage still bills. |
| Blob Storage, Hot LRS | Retail API, East US, meter `Hot LRS Data Stored`, product `Blob Storage`, first tier: **$0.0208 per GB-month**. | A few GB of photos is well under **$1**, before operations. |
| Key Vault, Log Analytics | Chosen in ADR 0002. Meters were not retrieved. | Not included. Do not treat them as zero. |

Rough total at low traffic: **about $15–20/month**, almost all of it the database. Container Apps stays in the free grant if it scales to zero.

### Notes for the open provider pick (ADR 0005)

ADR 0005 already sets the default to Microsoft Entra External ID and the fallback to Auth0, and stays Proposed until Brenner writes the pick. These notes are not a second decision.

- **Free tier.** Entra External ID core is free for the first 50,000 MAU ([FAQ](https://learn.microsoft.com/en-us/entra/external-id/customers/faq-customers), [pricing](https://azure.microsoft.com/en-us/pricing/details/microsoft-entra-external-id/)). The static pricing page does not show the per-MAU rate after that. A secondary write-up dated 2026-11-05 says $0.03; treat that as unverified. Auth0 Free is $0 for 25,000 MAU, with unlimited social connections subject to system limits, and one custom domain that requires a credit card ([pricing](https://auth0.com/pricing)). Essentials B2C starts at $35/month for 500 MAU.
- **Google.** Both support it. Entra: [identity providers](https://learn.microsoft.com/en-us/entra/external-id/customers/concept-authentication-methods-customers). Auth0: social connections on the free plan.
- **Apple.** Entra External ID has a built-in Apple provider ([how to add Apple](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-apple-federation-customers)). Social sign-in, including Apple, still opens a browser even on the native-auth web flow ([choose an approach](https://learn.microsoft.com/en-us/entra/external-id/customers/concept-choose-authentication-approach)). The Apple client secret has to be renewed every 6 months. Auth0 also has the browser connection and a native iOS exchange that does not leave the app ([native Apple](https://auth0.com/docs/authenticate/identity-providers/social-identity-providers/apple-native)). Both need a paid Apple Developer account.
- **OIDC + PKCE.** ADR 0005 already requires authorization code + PKCE for the Expo client. Auth0 documents that flow ([PKCE](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-pkce/add-login-using-the-authorization-code-flow-with-pkce)). Entra External ID is a normal OIDC issuer, so the same public-client flow applies. The API only checks the resulting access token.
- **Lock-in.** The API keys users by (`iss`, `sub`) and does not call Google or Apple itself, so changing provider is configuration plus a user migration. The costly part is accounts, not schema. Using MSAL-only native auth would tie the client to Entra more tightly than plain OIDC.

The 50,000 MAU grant and the Azure bill are why ADR 0005's default fits a solo deployment, if the system-browser Apple flow and the 6-month secret rotation are acceptable. If v1 needs Apple's in-app sheet with no browser, Auth0's native connection is the better fallback and is free to 25,000 MAU. Brenner still has to confirm the pick.

## Consequences

- One image, one database, cold starts on Container Apps, and a migration bundle that runs separately from the process.
- Unlisted events are absent from the map for every caller, including the owner. The owner reads them by id. A share token reads a live unlisted event and does not put it on the map.
- Ended events stay off the map (`now < end_at`, ADR 0006). The owner and users with attendance `attending` can still read them by id. `requested` does not.
- The tag vocabulary in OpenAPI is the contract the TypeScript client generates from. Renaming a value breaks that client.
