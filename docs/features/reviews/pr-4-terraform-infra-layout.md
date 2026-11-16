# PR 4 — Terraform infra layout

Reviewed by Atlas Arch. Squash-merged to `main` as `cac9691`.

Pull request: https://github.com/brennersta/Happengo/pull/4

Nothing in that pull request was applied. `terraform plan` and `terraform apply` are still not in CI. Provisioning waits until Brenner approves the spend.

## What was reviewed

`infra/` for the one deployed environment: Container Apps on the Consumption plan (scale to zero), Azure Database for PostgreSQL Flexible Server with PostGIS allow-listed, private blob containers, Key Vault, and Log Analytics. Managed identity and Key Vault references, no secret values in Terraform. The remote state backend is partial (`use_azuread_auth = true` only) so CI runs `terraform init -backend=false` and `terraform validate`.

## BLOCK at `baea03e`

Atlas blocked `baea03ead95bcb9e05cebefbedbebf63ca58e599`. ADR 0002 is local development plus one deployed environment. The first head also had staging and prod roots.

| Must-fix | Resolution on `325b71e` |
|---|---|
| Delete `infra/envs/staging/` and `infra/envs/prod/` | Deleted. |
| Drop their Dependabot entries | Staging, prod, and the ACR entry were removed. |
| Narrow the environment guard to dev | `local.environment == "dev"` in `infra/envs/dev/main.tf`. `locals.tf` only maps `dev`. |
| README: staging and prod are not first-class | A second root is a copy of dev when the first environment is actually in use. Purge protection stays off, because it cannot be turned off later. |

Also done on that commit:

- Dev cost estimate added to `infra/README.md`. Labelled North Europe USD list prices from the Azure Retail Prices API on 2026-11-16, not a quote. About $18–30 per month if the Burstable server runs all month, or about $5–16 per month if it is stopped. The disk is about $4 either way. This is not the free tier.
- GitHub Container Registry replaces Azure Container Registry. A public package needs no pull secret. A private package uses a versionless Key Vault secret URI. The token is not in Terraform. The quickstart placeholder image must be replaced before any apply.
- The unused `identity_client_id` input was removed from the container-apps module. The operator principal has Key Vault Administrator. The API identity only has Key Vault Secrets User.

## PASS at `325b71e`

Atlas passed `325b71e07492f368db082095f23d92f7641e5e05`. CI on that head was green ([run 43858707665](https://github.com/brennersta/Happengo/actions/runs/43858707665)): `infra` ran `fmt` and `validate`, and `ci-success` passed. `api` and `app` stayed skipped.

Merging the code was not approval to apply.

## Accepted decisions

- Region `northeurope`.
- PostgreSQL 16.
- Entra-only database access. The API identity is a Postgres administrator. That is v1 debt.
- No VNet.
- Partial remote backend.
- GitHub Container Registry instead of Azure Container Registry.
- Dev is the only environment root.
