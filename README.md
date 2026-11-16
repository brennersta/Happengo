# Happengo

Map-first app for discovering and creating short-lived local events.

Monorepo: `backend/` (ASP.NET Core Web API, .NET 10, PostgreSQL + PostGIS) and `apps/` / `packages/` (TypeScript client). Architecture decisions live in `docs/adr/`.

All changes land through pull requests into `main`.

## CI

Pull requests and pushes to `main` run [`.github/workflows/ci.yml`](.github/workflows/ci.yml). The check to require is `CI / ci-success`. [docs/ci.md](docs/ci.md) describes each job, and lists what CI does not do until Brenner approves it: Terraform plan or apply, Azure login or provisioning, container registry push, and EAS build or submit.

When the trees exist, the same commands CI runs are:

- API (.NET 10, ADR 0002): `dotnet restore`, `dotnet format --verify-no-changes`, `dotnet build`, and `dotnet test` on the solution under `backend/`.
- Client (pnpm workspace, ADR 0002): `pnpm install --frozen-lockfile`, then lint, `tsc --noEmit`, and tests for `apps/` and `packages/`.
- Terraform: `terraform fmt -check`, then `terraform init -backend=false` and `terraform validate`. No plan or apply.
