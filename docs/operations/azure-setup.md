# Set up the Happengo API on Azure

## 1. Prepare Azure

1. In the Azure portal, create or select a subscription and confirm billing and North Europe availability for PostgreSQL Flexible Server and Container Apps.
2. Create a dedicated resource group, for example `rg-happengo-mvp`, in North Europe. In the subscription, register the `Microsoft.App`, `Microsoft.OperationalInsights`, and `Microsoft.DBforPostgreSQL` resource providers before the first release.
3. In Microsoft Entra ID, create a single-tenant app registration for GitHub Actions. Record its application (client) and directory (tenant) IDs. Assign its service principal **Contributor** on the dedicated resource group.
4. In the app registration, add a GitHub Actions federated credential for organization `brennersta`, repository `Happengo`, entity type **Environment**, environment `azure-mvp`. The subject is `repo:brennersta/Happengo:environment:azure-mvp`, the issuer is `https://token.actions.githubusercontent.com`, and the audience is `api://AzureADTokenExchange`.

## 2. Configure GitHub and Auth0

1. Create the `azure-mvp` GitHub environment and restrict it to `main`. Add environment secrets `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, and `AZURE_SUBSCRIPTION_ID` using the IDs from Azure.
2. Add environment variables `AZURE_RESOURCE_GROUP`, `AUTH0_AUTHORITY` (such as `https://your-tenant.auth0.com/`), and `AUTH0_AUDIENCE` (your Auth0 API identifier). The example Bicep parameter file contains placeholders. Manual deployments require the real Auth0 values.
3. Leave `MODERATOR_USER_IDS` unset for no moderators. To enable moderation, set it to a JSON array of internal Happengo user IDs. The template maps these to indexed `Moderation__ModeratorUserIds__N` settings. Optionally set `HAPPENGO_WEB_ORIGIN` to the exact HTTPS origin of a real web client for CORS.
4. Wait for **Publish API image** to succeed on main. In GHCR package settings, ensure `ghcr.io/brennersta/happengo-api` is public so the app and migration job can pull without credentials. Public visibility exposes the image contents, so keep credentials out of the build context and image.

## 3. Deploy manually

1. From GitHub Actions, select **Deploy Azure API**, run it on `main`, and approve the environment if approvals are configured. The workflow checks that the image for that exact commit exists, logs in via OIDC, runs ARM what-if, then applies the template. What-if is logged and the same run proceeds to apply.
2. The workflow starts the Container Apps migration job and waits for success. On the first deployment, ingress stays internal with a TCP readiness probe until migration succeeds. The workflow then enables external HTTPS, switches to the `/health` probe, and checks it. For failures, check the migration execution and API replica logs in Azure and rerun once the cause is resolved. Allow for Entra role propagation on the first deployment.
3. The API and migration job each use their Azure system identity as a PostgreSQL Entra admin for this MVP. The migration job creates the schema with EF and grants the runtime identity access to its tables and sequences. The initial EF migration already creates PostGIS before spatial tables. Both PostGIS and pgcrypto are allowlisted because the migration history uses both. The database accepts Azure-origin public connections through the Azure services firewall rule, which covers other Azure subscriptions too. Entra authentication and TLS still apply.
4. Copy `EXPO_PUBLIC_API_URL=https://<API_FQDN>` from the job summary into `apps/mobile/.env.local` or the environment of each non-demo Expo build before bundling. Set the existing `EXPO_PUBLIC_OIDC_*` values for your Auth0 application and audience. Local development can still use localhost. GitHub Pages keeps demo mode and mocks.
5. Open Discover in the API-backed build, sign in, and check event creation and reads. Review per-client rate limiting before broader rollout. The template leaves trusted forwarding disabled until the ingress proxy ranges are verified and configured. Behind ingress, the app may see proxy IPs instead of client IPs.

## Cost and teardown

Budget roughly **US$27–30/month** as an initial planning estimate. Confirm North Europe pricing in the [Azure pricing calculator](https://azure.microsoft.com/en-us/pricing/calculator/) with B1ms, 32 GiB storage, one minimum Container Apps replica and your expected logs and traffic. Actual costs vary with usage, region, offer, and taxes.

To tear down, export or back up any data you need, then delete the dedicated resource group from the Azure portal. This deletes the database, app, migration job, and workspace. Remove the GitHub environment credentials and the Entra app registration if it was created solely for Happengo. GHCR package retention is managed separately.
