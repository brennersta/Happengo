# 0002. Review of PR #4, Terraform infra layout

- Pull request: https://github.com/brennersta/Happengo/pull/4
- Merge commit: `cac9691`
- Gated head: `325b71e`

## Areas

`infra/` for the one deployed environment: Container Apps on the Consumption plan, scale to zero; Azure Database for PostgreSQL Flexible Server with PostGIS allow-listed; private blob containers; Key Vault; Log Analytics. Managed identity and Key Vault references. No secret values in Terraform. The remote state backend is partial, so CI runs `terraform init -backend=false` and `terraform validate`.

## Gates

- Architecture: block on `baea03e`. ADR 0002 is local development plus one deployed environment. That head also had staging and prod roots.
- Architecture: pass on `325b71e`. CI run [43858707665](https://github.com/brennersta/Happengo/actions/runs/43858707665) was green. `infra` ran. `ci-success` passed.

Merging the code was not approval to apply. Nothing is provisioned until Brenner approves the spend.

## Conflict rulings

The accepted ADRs won, and Atlas accepted these decisions that no ADR covered:

- Region `northeurope`.
- PostgreSQL 16.
- Entra-only database access. The API identity is a Postgres administrator. That is v1 debt.
- No VNet.
- Partial remote backend.
- GitHub Container Registry instead of Azure Container Registry.
- Dev is the only environment root.

## Follow-ups

- [x] Delete `infra/envs/staging/` and `infra/envs/prod/`.
- [x] Drop the staging, prod, and ACR Dependabot entries.
- [x] Narrow the environment guard to `local.environment == "dev"`.
- [x] README: a second root is a copy of dev when the first environment is in use. Purge protection stays off, because it cannot be turned off later.
- [x] Dev cost estimate in `infra/README.md`. Labelled North Europe USD list prices from the Azure Retail Prices API on 2026-11-16, not a quote. About $18–30 per month if the Burstable server runs all month, or about $5–16 per month if it is stopped. The disk is about $4 either way. Not the free tier.
- [x] GHCR replaces ACR. A public package needs no pull secret. A private package uses a versionless Key Vault secret URI. The quickstart placeholder must be replaced before any apply.
- [x] Remove the unused `identity_client_id` input. The operator principal has Key Vault Administrator. The API identity only has Key Vault Secrets User.
