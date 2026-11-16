# Happengo API

ASP.NET Core on .NET 10. One project, feature folders, EF Core, PostgreSQL with PostGIS. Product rules live in the ADRs, especially [0003](../docs/adr/0003-data-model.md), [0005](../docs/adr/0005-authentication.md), [0006](../docs/adr/0006-geo-queries.md), and [0007](../docs/adr/0007-privacy-enforcement.md). This README is how to run the process.

The identity provider is not chosen. Local placeholders for `Authentication:Authority`, `Authentication:Audience`, and the database live in `appsettings.Development.json` (`https://idp.example.com/`, audience `happengo-api`). Production must set `ConnectionStrings__Happengo`, `Authentication__Authority`, and `Authentication__Audience`. The API never names a vendor.

`ForwardedHeaders:KnownNetworks` and `ForwardedHeaders:KnownProxies` list the proxies whose `X-Forwarded-For` is trusted. Both are empty unless you set them, so a client cannot spoof the address used by the rate limiter.

## Local database

```bash
docker compose up -d
dotnet tool restore
dotnet ef database update --project src/Happengo.Api
dotnet run --project src/Happengo.Api
```

The API listens on `http://localhost:5080`. It does **not** apply migrations on startup. Compose uses `postgis/postgis:16-3.5` with user, password, and database `happengo`, published only on `127.0.0.1:5432`, which matches the development connection string.

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
| `ConnectionStrings:Happengo` | Npgsql connection string |
| `Authentication:Authority` | OIDC issuer metadata and JWKS |
| `Authentication:Audience` | Expected `aud` |

Environment variables use the usual `__` form, for example `ConnectionStrings__Happengo`.
