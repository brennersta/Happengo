# 0002. Stack and modular monolith

- Status: Accepted
- Date: 2026-11-16

## Context

Happengo is rebuilt by one developer. The product needs a phone and web map, privacy rules that hold on the server, and viewport queries. v1 traffic is small. Cost should stay on free and low tiers. The old app's chat, feed, and live-presence ideas are out of scope, and nothing in v1 needs a second deployable or a broker.

## Decision

Backend: ASP.NET Core Web API on .NET 10, Entity Framework Core, PostgreSQL with PostGIS.

One project, `backend/`, with feature folders `Events`, `Attendance`, `Friends`, `Media`, and `Identity`. Each feature owns its entities and its DTOs. There is no shared DTO dump. ArchUnitNET enforces those module boundaries in the build.

v1 is a single API process. No microservices and no message broker.

Client: one Expo (React Native, TypeScript) app for iOS, Android, and web, with MapLibre. The tile provider is open ([ADR 0006](0006-geo-queries.md)).

The TypeScript client is generated from the API OpenAPI document with `openapi-typescript` and `openapi-fetch`, and lives in `packages/api-client`.

pnpm monorepo:

- `apps/mobile`
- `packages/api-client`
- `backend/`
- `infra/`
- `docs/`

Azure: Container Apps on the consumption plan, scaling to zero; Blob Storage; Key Vault. Terraform defines the resources. GitHub Actions runs CI and, later, deploy. Environments: local development and one deployed environment. Prefer free and low tiers, including a Burstable PostgreSQL Flexible Server.

## Consequences

- One container image, one connection string, in-process calls between features. ArchUnitNET fails the build when a feature reaches into another feature's internals.
- The generated client is the contract. Hand-written fetch wrappers do not sit beside it.
- Container Apps can scale to zero, so the API will cold-start. PostgreSQL is the standing cost; the Burstable server can be stopped while idle. See [infra/README.md](../../infra/README.md).
- A second deployed environment (staging or production split) waits until the first one is in use.
