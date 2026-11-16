# CI

GitHub Actions workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

It runs on every pull request and on every push to `main`. There are no path filters on the trigger. The `ci-success` job always runs, so it can be the single required status check. The job's check name is `CI / ci-success`.

Branch protection is not changed by the workflow. After this is on `main`, require **`CI / ci-success`** on pull requests into `main`. Do not also require `api`, `app`, or `infra`. Those jobs are skipped until their trees exist, and a skipped required check blocks the pull request.

## Jobs

| Job | When it runs | What it does |
|---|---|---|
| `changes` | Always | Diffs the pull request (or the push) and checks that the project files exist. Writes the gate for the other jobs. |
| `api` | `backend/**` or this workflow changed, **and** `backend/` contains a `.sln` or `.csproj` | `dotnet restore`, `dotnet format --verify-no-changes`, `dotnet build`, `dotnet test` |
| `app` | `apps/**`, `packages/**`, the pnpm workspace files, or this workflow changed, **and** `apps/` or `packages/` contains a `package.json` | `pnpm install --frozen-lockfile`, then `lint`, `tsc --noEmit`, and `test` for those packages |
| `infra` | `infra/**` or this workflow changed, **and** `infra/` contains a `.tf` file | `terraform fmt -check` and, in each directory that contains `.tf` files, `terraform init -backend=false` and `terraform validate` |
| `ci-success` | Always, unless the run was cancelled | Fails if any of those jobs failed, was cancelled, or was skipped when its gate said to run. A skip while the tree is still missing is a pass. |

`infra/` contains Terraform, so a pull request that changes it runs the `infra` job. Before any `.tf` file existed, that job stayed skipped. A workflow-only change does not force `api` or `app` to run before their projects exist, and it does not force `infra` when `infra/` has no `.tf` files.

Once a project exists, a real failure fails the job. The gate does not swallow a failed test, a format diff, a missing lockfile, or a Terraform validation error.

## Versions

From [ADR 0002](adr/0002-stack-and-modular-monolith.md):

- API: .NET 10. CI installs the `10.0.x` SDK. `dotnet test` is where ArchUnitNET module checks run once that test project is in the solution. There is no separate job for it.
- Client: pnpm workspace, `apps/mobile` and `packages/api-client`. CI uses `pnpm install --frozen-lockfile`, not `npm ci`.
- Layout the gates use: `backend/`, `apps/`, `packages/`, `infra/`.

Not specified by any ADR on `main`. Chosen here so the jobs are reproducible:

| Tool | CI value | Why |
|---|---|---|
| Node.js | `22`, unless `.nvmrc` or `.node-version` is in the repo | Active LTS is Node 26 (since 2026-10-28). Current Expo (SDK 58) accepts `^22.13.0`, `^24.3.0`, or `^26.0.0`. CI stays on the Node 22 line until the client PR adds a version file. |
| pnpm | `packageManager` (or `devEngines.packageManager`) in the root `package.json` when that field names pnpm; otherwise `10.34.9` | Latest pnpm 10 when this workflow was added. Expo's own repo was still on the 10 line. A workspace that sets `packageManager` wins, and the action is given that exact version. |
| Terraform | `1.17.2` | Latest stable when this workflow was added. No ADR pins Terraform. `init` uses `-backend=false` only. When a module sets `required_version`, it has to accept `1.17.2` or this pin should change in the same PR. |

The app job also requires a root `pnpm-workspace.yaml` and `pnpm-lock.yaml` once an `apps/` or `packages/` `package.json` exists. That matches the pnpm workspace in ADR 0002.

## What `ci-success` treats as success

- `changes` succeeded.
- `api`, `app`, and `infra` each either succeeded because their gate was true, or were skipped because their gate was false.

A gate is true only when both the path changed and the project files exist. Pushing this workflow while `backend/`, `apps/`, and `packages/` are absent, and while `infra/` has no `.tf` files, skips those three jobs and `ci-success` passes.

## Permissions and cache

Workflow token: `contents: read`. `ci-success` sets `contents: none`. The token is not granted `id-token`, `packages`, `deployments`, or `actions: write`.

Dependency caching uses the runner cache (NuGet global packages, the pnpm store, Terraform provider plugins). Cache access is GitHub's default: write on trusted triggers (push, and pull requests from this repository), read-only on low-trust triggers. The workflow does not set `cache-mode: write`, so a fork pull request cannot overwrite the cache.

Nothing in the workflow reads a secret. No Azure login, no OIDC, no Expo token.

Pull request runs cancel an older in-progress run of the same PR. Pushes to `main` are not cancelled.

Actions are pinned to commit SHAs. Dependabot's `github-actions` entry is what bumps those pins. Terraform updates are enabled per root and module in [`.github/dependabot.yml`](../.github/dependabot.yml) now that those directories have lock files. nuget and npm stay commented out until their manifests exist. Enabling them earlier makes Dependabot error on the missing directory.

## Local equivalents

When the trees exist, the same commands CI runs:

```bash
# API (.NET 10), from the repo root. TARGET is the one .sln under backend/,
# or the single .csproj if there is no solution yet.
dotnet restore "$TARGET"
dotnet format "$TARGET" --verify-no-changes --no-restore
dotnet build "$TARGET" --no-restore --configuration Release
dotnet test "$TARGET" --no-build --configuration Release

# Client (pnpm workspace at the repo root)
pnpm install --frozen-lockfile
pnpm --filter "./apps/**" --filter "./packages/**" run lint
pnpm --filter "./apps/**" --filter "./packages/**" exec tsc --noEmit
pnpm --filter "./apps/**" --filter "./packages/**" run test

# Terraform. No plan, no apply, no backend.
terraform fmt -check -diff -recursive infra
terraform -chdir="$DIR" init -backend=false -input=false
terraform -chdir="$DIR" validate
```

## Deliberately not in CI

These wait until Brenner approves them. This workflow does not call them, and it has no credentials that could:

- `terraform plan` or `terraform apply`, including a plan against a live subscription
- any Azure login, OIDC federation, or provisioning
- container build or push, including GitHub Container Registry
- `eas build`, `eas submit`, or `eas update`
- GitHub Environments, remote Terraform state, or any secret

Deploy, nightly end-to-end, and native builds are separate workflows and are not added here.
