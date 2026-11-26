# Review 0028 — Azure MVP hosting

The North Europe Bicep deployment defines the consumption API, PostgreSQL, logging, and a manual migration job. The API and job use independent system-assigned identities and refresh Entra database tokens through Npgsql. The job runs the existing EF migrations, including the initial PostGIS extension creation, then grants the app access to the schema objects.

The GHCR workflow publishes main images with commit SHA and latest tags. Azure deployment is manual and checks the SHA image before Azure login. On the first deployment, ingress stays internal until the migrations finish and the workflow switches to public HTTPS with the existing health probe. Follow the [Azure setup guide](../../operations/azure-setup.md) for Auth0, moderation, OIDC, cost and hosted Expo build settings.

## Validation

- Mobile `lint`, `typecheck`, `test --runInBand` (80 passed), and `export:web` passed via `pnpm --filter @happengo/mobile`.
- Standalone Bicep `build infra/azure/main.bicep --stdout` and `build-params infra/azure/main.bicepparam --stdout` passed. No Azure CLI commands were run locally.
- `dotnet format backend/Happengo.sln --verify-no-changes --no-restore` reported line ending and whitespace diagnostics in existing files. The same check scoped to the changed backend files passed.
- `dotnet test backend/Happengo.sln --no-restore` compiled and recorded 43 passes and 218 failures because the Docker endpoint required by Testcontainers was unavailable. Docker Desktop still did not expose the engine after a start attempt.
- Azure provisioning, managed identity sign-in, GHCR publication, and the deployment workflow remain unverified against live services.
