# Happengo API

ASP.NET Core on .NET 10. One project, feature folders, EF Core, PostgreSQL with PostGIS. Product rules live in the ADRs, especially [0003](../docs/adr/0003-data-model.md), [0005](../docs/adr/0005-authentication.md), [0006](../docs/adr/0006-geo-queries.md), and [0007](../docs/adr/0007-privacy-enforcement.md). This README is how to run the process.

The identity provider is not chosen. Development keeps the placeholder issuer `https://idp.example.com/` and audience `happengo-api` in `appsettings.Development.json`. The database password is not in that file. Production fails at startup when `ConnectionStrings:Happengo` is missing or still points at the local database, and when `Authentication:Authority` is missing or still the placeholder. The API never names a vendor.

`ForwardedHeaders:KnownNetworks` and `ForwardedHeaders:KnownProxies` list the proxies whose `X-Forwarded-For` is trusted. Both are empty unless you set them, so a client cannot spoof the address used by the rate limiter.

## Local database

```bash
docker compose up -d
dotnet user-secrets set "ConnectionStrings:Happengo" "Host=localhost;Port=5432;Database=happengo;Username=happengo;Password=happengo" --project src/Happengo.Api
dotnet tool restore
dotnet ef database update --project src/Happengo.Api
dotnet run --project src/Happengo.Api
```

`dotnet user-secrets` stores the connection string outside the repo (`UserSecretsId` is on the API project). `ConnectionStrings__Happengo` does the same job if you prefer an environment variable. Compose already sets `POSTGRES_PASSWORD` to `happengo` for the database container; that is the local password the command above repeats. Do not copy it into Production.

The API listens on `http://localhost:5080`. It does **not** apply migrations on startup. Compose uses `postgis/postgis:16-3.5` with user and database `happengo`, published only on `127.0.0.1:5432`. `appsettings.Development.json` names that host and user and leaves the password out. Without the user-secret or the environment variable, the process still starts, and the connection fails when a request needs the database.

`GET /v1/events?bbox=24.6,59.3,24.9,59.5` returns public events that have not ended. Anonymous calls are allowed on the three event reads and on `GET /health` (a database check). Every other route requires a bearer token.

Integration tests share `PostGisFixture` (the container) and `ApiFactory` (`WebApplicationFactory<Program>` with a settable `IClock`). The collection name is `api`.

## Tests

```bash
dotnet test
dotnet test --filter Category=Integration
dotnet test --filter Category!=Integration
```

Tests that start PostGIS or `ApiFactory` extend `IntegrationTest` in the test project. That base class puts them in the shared `api` collection and tags them `[Trait("Category", "Integration")]`, so CI can split them later. Extend that class for a new database test instead of adding the trait by hand. The architecture, cursor, and OpenAPI tests do not use the database and are not tagged.

Integration tests need Docker. The suite covers the viewport query, the injected clock, the visibility matrix, the feature-boundary rule, and the OpenAPI document.

## Migrations

Add one from `backend/`:

```bash
dotnet tool restore
dotnet ef migrations add <Name> --project src/Happengo.Api --output-dir Infrastructure/Persistence/Migrations
```

Apply it locally with `dotnet ef database update --project src/Happengo.Api`.

For deploy, build a bundle and run it as its own step (still not at process startup):

```bash
./scripts/ef-bundle.sh
./dist/efbundle --connection "$ConnectionStrings__Happengo"
```

The bundle targets `linux-x64`. Azure Database for PostgreSQL needs the PostGIS extension allowed on the server. The initial migration creates it.

A container image for Azure Container Apps:

```bash
docker build -f backend/Dockerfile backend
```

Run that from the repository root. The image listens on port 8080 and does not migrate.

## OpenAPI

The contract is `api/openapi.json`, including `EventTag` as a string enum. After changing a route or a response:

```bash
./scripts/export-openapi.sh
```

CI fails if the file drifts. The document is also served at `/openapi/v1.json` in Development.

## Configuration

| Setting | Purpose |
|---|---|
| `ConnectionStrings:Happengo` | Npgsql connection string. In Production this must be set and must not be the local database. |
| `Authentication:Authority` | OIDC issuer metadata and JWKS. In Production this must be set and must not be `https://idp.example.com/`. |
| `Authentication:Audience` | Expected `aud` |
| `RateLimiting:Writes` | Permit limit and window for the write group. Default 30 per 60 seconds, partitioned by (`iss`, `sub`) or client IP. |
| `RateLimiting:Auth` | Same shape for the auth group. Default 20 per 60 seconds. |
| `RateLimiting:Uploads` | Same shape for the upload group. Default 30 per 60 seconds. |
| `RateLimiting:MapReads` | Per-IP limit for `GET /v1/events`. Default 120 per 60 seconds. |
| `RateLimiting:ShareReads` | Per-IP limit for `GET /v1/events/shared/{token}`. Default 30 per 60 seconds. |

Each rate-limit section has `PermitLimit` and `WindowSeconds`. A rejected request is HTTP 429 with ProblemDetails (`https://happengo.app/problems/rate-limited`). Write, auth, and upload groups still have no routes; those policies apply when the routes are mapped onto the groups. Map reads and the share-link read are limited per client IP. `ForwardedHeaders` decides which proxies may set that IP.

Environment variables use the usual `__` form, for example `ConnectionStrings__Happengo` and `RateLimiting__MapReads__PermitLimit`.
