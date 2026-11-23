# Happengo

Map-based app concept for local incident awareness, nearby event discovery, and private gathering memories. See the plain-language [business product description](docs/business/product-description.md), the [page-by-page feature catalog](docs/business/feature-catalog.md), [product vision](docs/product-vision.md), and [feature requirements](docs/product-features.md). The currently implemented code is an early social-event/discovery foundation; the broader use cases remain to be designed and built.

For Grok or another coding agent continuing this repository, start with [`GROK.md`](GROK.md), then follow its reading order.

Monorepo: `backend/` (ASP.NET Core Web API, .NET 10, PostgreSQL + PostGIS) and `apps/` / `packages/` (TypeScript client). Architecture decisions live in `docs/adr/`.

All changes land through pull requests into `main`.

The public demo, once GitHub Pages is enabled for this repository, is [https://brennersta.github.io/Happengo/](https://brennersta.github.io/Happengo/). It is a static web export with sample data in the browser. Nothing is saved, and it does not call the API or Auth0.

## CI

Pull requests and pushes to `main` run [`.github/workflows/ci.yml`](.github/workflows/ci.yml). The check to require is `CI / ci-success`. [docs/ci.md](docs/ci.md) describes each job, and lists what CI does not do until Brenner approves it: Terraform plan or apply, Azure login or provisioning, container registry push, and EAS build or submit.

When the trees exist, the same commands CI runs are:

- API (.NET 10, ADR 0002): `dotnet restore`, `dotnet format --verify-no-changes`, `dotnet build`, and `dotnet test` on the solution under `backend/`.
- Client (pnpm workspace, ADR 0002): `pnpm install --frozen-lockfile`, then lint, `tsc --noEmit`, and tests for `apps/` and `packages/`.
- Terraform: `terraform fmt -check`, then `terraform init -backend=false` and `terraform validate`. No plan or apply.
