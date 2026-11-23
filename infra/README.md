# Infrastructure

Terraform for Happengo's Azure resources. Nothing here has been applied. `terraform plan` and `terraform apply` are not part of CI, and they are not a step in this layout. Brenner approves spend before dev is provisioned. [ADR 0002](../docs/adr/0002-stack-and-modular-monolith.md) is the hosting decision this tree follows: local development and one deployed environment.

The AzureRM provider is `~> 5.14` (locked at 5.14.0). Terraform is `>= 1.17.2, < 2.0.0`, which is the 1.17.2 pin in CI.

## Layout

```
infra/
  modules/
    container-apps/   # Consumption environment and the API app
    key-vault/        # Standard vault, RBAC, no secret values
    log-analytics/    # Log Analytics workspace, PerGB2018, daily cap
    postgres/         # Flexible Server, Burstable, PostGIS allow-listed
    storage/          # Blob account, private covers and albums containers
  envs/
    dev/              # the one deployed environment
```

There is no `staging` or `prod` root. ADR 0002 says a second deployed environment waits until the first is in use. Copy `infra/envs/dev` when that happens, and change the `dev` guard in the copy. Do not land a prod root early: Key Vault purge protection cannot be turned off after it is enabled, and dev leaves it off for that reason.

The user-assigned identity, resource group, and role assignments live in the dev root because they cross modules. The API identity reads blobs and Key Vault secrets, and it is a Postgres Entra administrator. It does not pull the container image. Images come from GitHub Container Registry, not Azure Container Registry.

There is no VNet module. Private endpoints, NAT, and zone-redundant networking are not in this layout.

The Log Analytics module is `log-analytics`, not `logs`. The root `.gitignore` ignores every `logs/` directory so .NET build output stays untracked.

## What dev contains

| Piece | Module or root | Notes |
|---|---|---|
| Resource group | root | `rg-happengo-dev-neu` |
| User-assigned identity | root | `id-happengo-api-dev`. The API runs as this identity. |
| Log Analytics | `modules/log-analytics` | Container Apps ships stdout here. No Application Insights resource. |
| Key Vault | `modules/key-vault` | Standard, RBAC. No secret values are created. |
| Blob storage | `modules/storage` | Private containers `covers` and `albums` ([ADR 0008](../docs/adr/0008-image-storage.md)). |
| PostgreSQL | `modules/postgres` | Flexible Server 16, Burstable, database `happengo`. |
| API app | `modules/container-apps` | Consumption, external HTTPS, scale to zero. Pulls a GHCR image. |

Names that must be globally unique append `uniqueness_suffix` (4 lowercase letters or digits) from tfvars: the storage account, the vault, and the Postgres server. Example with suffix `dev1`: `sthappengodevdev1`, `kv-happengo-dev-dev1`, `psql-happengo-dev-dev1`.

Region is `northeurope` (`neu` in the resource group name). No ADR names a region. North Europe is the Azure region used from Tallinn. The variable rejects anything else. Atlas accepted this.

## dev only

Copy `terraform.tfvars.example` to `terraform.tfvars` only after Brenner approves the spend. `terraform.tfvars` is gitignored. The example file has placeholders, not real ids, and no secret values.

## Identity, secrets, Postgres, blobs

There are no secret variables. Subscription id, tenant id, the break-glass admin's object id, the Key Vault operator's object id, and the OIDC authority and audience are identifiers ([ADR 0005](../docs/adr/0005-authentication.md)). The API reads `Authentication__Authority` and `Authentication__Audience` from ordinary environment variables.

PostgreSQL password authentication is off. There is no administrator password in variables, in Key Vault, or in this configuration. A break-glass Entra principal (prefer a group) is an administrator, and so is the API's managed identity. Flexible Server has no Terraform resource for a non-admin database user, so the API identity is an administrator. That is broader than a normal login, and it is accepted v1 debt. Narrow it when migrations can run `pgaadauth_create_principal` as the break-glass admin.

The app's non-secret settings include `AZURE_CLIENT_ID`, `POSTGRES_HOST`, `POSTGRES_DATABASE`, `POSTGRES_USERNAME` (the identity name), `BLOB_ACCOUNT_URL`, the two container names, and `KEY_VAULT_URI`. It signs in with the managed identity. No password is set.

Key Vault references are the only way a secret reaches the app. `key_vault_secret_environment_variables` maps a setting name to a versionless secret URI (`https://<vault>.vault.azure.net/secrets/<name>`). The value itself is rejected by validation. The API identity has Key Vault Secrets User. The operator principal in `key_vault_operator_object_id` has Key Vault Administrator, so a person can create those secrets. Nothing in this tree creates a secret. A geocoding provider key ([ADR 0006](../docs/adr/0006-geo-queries.md) is still open) would be created in the vault out of band and then referenced.

Blob containers are private ([ADR 0008](../docs/adr/0008-image-storage.md)). Shared keys are disabled, so account-key SAS will not work. The API issues a user-delegation SAS with Storage Blob Data Contributor, which includes `generateUserDelegationKey`. The account still allows public network access because the client uploads directly. A guessed URL must not return the object. That is the container access level, not a public network flag.

PostGIS and pgcrypto are allow-listed with the server parameter `azure.extensions=POSTGIS,PGCRYPTO`. `CREATE EXTENSION` belongs in the API migration, not here. GiST indexes are part of that migration ([ADR 0003](../docs/adr/0003-data-model.md), [ADR 0006](../docs/adr/0006-geo-queries.md)). The share-token migration uses pgcrypto `digest()`.

## Container image (GHCR)

There is no Azure Container Registry. Basic ACR is a fixed daily charge (about $5 per 30 days at the North Europe list price below) and GHCR does not add that charge for a public package.

Container Apps requires an image. The default is the public placeholder `mcr.microsoft.com/k8se/quickstart:latest`. It does not listen on port 8080. **Replace it with the Happengo API image before any apply.** Applying the placeholder will not serve the API.

The intended image is `ghcr.io/<owner>/happengo-api:<tag>`. Two pull modes, and neither puts a token in git or in a Terraform variable:

| Package | What to set | Where the credential lives |
|---|---|---|
| Public GHCR package | `container_image` only. Leave `registry_server`, `registry_username`, and `registry_password_key_vault_secret_id` null. | Nowhere. Container Apps pulls a public image with no registry block. |
| Private GHCR package | Those three fields as well. `registry_server` is `ghcr.io`. `registry_username` is the GitHub user that owns the token. | A `read:packages` token created in Key Vault by the operator. Terraform only sees the versionless secret URI. The API identity reads it (Key Vault Secrets User) and Container Apps uses it as the registry password. A managed identity cannot log in to GHCR, so this is a username and token, not `AcrPull`. |

This configuration does not build or push an image. CI does not either.

## Networking

No VNet, subnet, private DNS zone, private endpoint, or NAT gateway. Those cost more than the API at v1, and no ADR requires them. Atlas accepted this.

Postgres is reached on the public endpoint. The firewall rule named `allow-azure-services` is `0.0.0.0`–`0.0.0.0`. In Azure that means "Azure services", not the public internet. A rule of `0.0.0.0`–`255.255.255.255` is rejected. Consumption Container Apps do not have a stable outbound IP, so this is how the API reaches Postgres without a VNet. The compensating control is Entra-only authentication: there is no database password. Any extra operator range goes in `postgres_firewall_rules`.

Container Apps zone redundancy stays off. In azurerm 5.14, setting `zone_redundancy_enabled` at all requires `infrastructure_subnet_id`, which would create the VNet dependency this layout defers.

## Remote state

The dev root declares an `azurerm` backend and sets `use_azuread_auth = true`, so state is not read with a storage account key. The rest of the backend is partial on purpose. These values are not in the committed config, because the state storage account is a separate Azure cost and this tree does not create it. Atlas accepted the partial backend.

| Backend setting | Who supplies it | Suggested value |
|---|---|---|
| `resource_group_name` | `-backend-config` | a resource group created only after spend is approved |
| `storage_account_name` | `-backend-config` | a globally unique Standard LRS account, not managed here |
| `container_name` | `-backend-config` | `tfstate` |
| `key` | `-backend-config` | `dev.terraform.tfstate` |
| `use_azuread_auth` | committed backend block | `true` |

`terraform init -backend=false` skips this block. That is what CI runs, and it is the local check below. A real `terraform init` without `-backend=false` will prompt for the missing settings. Do not run that, and do not create the state account, until Brenner approves it.

Once dev is applied, state will hold Log Analytics shared keys because the Container Apps environment integration reads them. That is another reason not to apply until remote state exists and access to it is limited. State files are gitignored. Do not commit them.

## Format and validate

Same commands as the `infra` job in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). No subscription, no login, no plan, no apply.

```bash
terraform fmt -check -diff -recursive infra

# Every directory under infra/ that contains a .tf file, modules included.
terraform -chdir="$DIR" init -backend=false -input=false
terraform -chdir="$DIR" validate
```

`terraform.tfvars` is not required for validate.

## What will cost money once applied

Dev is not on the Azure free tier. The database disk bills even when the server is stopped. Nothing in this pull request is applied.

| What is billed | Terraform resource | Dev default |
|---|---|---|
| PostgreSQL Flexible Server compute | `azurerm_postgresql_flexible_server` | Burstable `B_Standard_B1ms`, one zone, high availability off, Entra auth only |
| PostgreSQL storage | same server | 32 GiB `Premium_LRS`, tier `P4`, auto-grow off |
| PostgreSQL backup | same server | 7 days, geo-redundant backup off. Backup storage up to the provisioned size is included. |
| Container Apps environment | `azurerm_container_app_environment` | Consumption workload profile, zone redundancy off, logs to Log Analytics |
| API container app | `azurerm_container_app` | Consumption, 0.25 vCPU, 0.5 Gi, 0–1 replicas |
| Blob storage | `azurerm_storage_account` | `Standard` / `LRS` / `Hot`, TLS 1.2, shared keys off |
| Key Vault | `azurerm_key_vault` | `standard`, RBAC, purge protection off, soft-delete 7 days |
| Log Analytics | `azurerm_log_analytics_workspace` | `PerGB2018`, retention 30 days, daily cap 0.1 GB |

These are created with dev and do not have a separate meter: the resource group, the user-assigned identity, the role assignments (Storage Blob Data Contributor, Key Vault Secrets User, Key Vault Administrator), the `happengo` database, the `azure.extensions` setting, firewall rules, Entra administrator records, and the `covers` and `albums` containers. Blob soft-delete is 7 days and is billed as stored data on the storage account.

GHCR is not an Azure resource. A public package has no registry charge. A private package uses GitHub Packages storage, which is outside this Azure estimate.

Egress is usage on the resources above, not its own resource.

[ADR 0002](../docs/adr/0002-stack-and-modular-monolith.md) says the Burstable server can be stopped while idle. Stopping pauses compute. Storage still bills. This layout does not stop the server for you.

Not created here, so not in the table: Azure Container Registry, the remote state storage account, any VNet or private endpoint or NAT gateway, Application Insights, a larger Postgres tier, zone-redundant or geo-redundant SKUs, and a map or geocoding provider.

### Rough monthly cost (dev)

This is a labelled estimate, not a quote and not an invoice. Figures are USD list prices for `northeurope` from the [Azure Retail Prices API](https://prices.azure.com/api/retail/prices), queried on 2026-11-16. The subscription currency and any discount will differ. Tax and egress are excluded. A month is taken as 730 hours.

Published pages for the same meters:

- [PostgreSQL Flexible Server](https://azure.microsoft.com/en-us/pricing/details/postgresql/flexible-server/)
- [Container Apps](https://azure.microsoft.com/en-us/pricing/details/container-apps/) and [how billing works](https://learn.microsoft.com/en-us/azure/container-apps/billing)
- [Blob Storage](https://azure.microsoft.com/en-us/pricing/details/storage/blobs/)
- [Key Vault](https://azure.microsoft.com/en-us/pricing/details/key-vault/)
- [Azure Monitor / Log Analytics](https://azure.microsoft.com/en-us/pricing/details/monitor/)
- [Container Registry](https://azure.microsoft.com/en-us/pricing/details/container-registry/) (not deployed; listed so the GHCR choice is priced)
- [Backup storage included with Flexible Server](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-backup-restore)
- [Stop a Flexible Server](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/how-to-stop-start-server)
- [GitHub Packages](https://docs.github.com/en/billing/concepts/product-billing/github-packages) for GHCR

Retail meters used:

| Meter | List price |
|---|---|
| Flexible Server Burstable BS Series Compute, `B1MS` | $0.018 per hour |
| Flexible Server Storage, Storage Data Stored | $0.1265 per GB-month |
| Flexible Server Backup Storage LRS | $0.095 per GB-month above the included amount |
| Container Apps Standard vCPU Active Usage | $0.000024 per second |
| Container Apps Standard Memory Active Usage | $0.000003 per GiB-second |
| Blob, General Block Blob v2, Hot LRS Data Stored (first tier) | $0.022 per GB-month |
| Key Vault Standard operations | $0.03 per 10,000 |
| Log Analytics data ingestion | $2.76 per GB after the free allowance |
| Container Registry Basic registry unit | $0.1666 per day |

Worked monthly amounts at the dev defaults:

| Piece | Assumption | Amount |
|---|---|---|
| Postgres compute, left running | 0.018 × 730 | about $13 |
| Postgres compute, stopped | stop pauses compute | $0 |
| Postgres disk | 0.1265 × 32 GB | about $4 |
| Postgres backup | within the included copy of the 32 GB disk | $0 |
| Container Apps | `min_replicas = 0`, light dev traffic inside the monthly free grant (180,000 vCPU-seconds, 360,000 GiB-seconds, 2 million requests) | about $0 |
| Container Apps if one 0.25 vCPU / 0.5 Gi replica stayed active all month | after that free grant | about $14. This is not the default. |
| Blob + Key Vault | a few GB of photos and ordinary secret operations | under $1 |
| Log Analytics | 0.1 GB/day cap is 3 GB in a 30-day month. The pricing page includes 5 GB of ingestion per billing account per month. | $0 if that allowance is still free. About $8 (3 × 2.76) if it is already used. |
| GHCR public package | no Azure registry | $0 |
| ACR Basic, if it had been kept | 0.1666 × 30 days | about $5. Not deployed. |

**Estimate for dev: about $18–30 per month if Postgres runs all month, or about $5–16 per month if it is stopped when idle.**

The low end is compute (or no compute) plus the $4 disk, with Container Apps and logs inside the published allowances. The high end is the same, plus logs billed at the daily cap because the 5 GB allowance is already used by something else. A replica left running all month is extra and is not in that range. This is not free.

The Postgres module only accepts a `B_*` SKU. Storage replication is hardcoded to LRS. Log retention is hardcoded to 30 days. The daily cap must be greater than 0 and at most 5 GB, so unlimited ingestion (`-1`) cannot be set in tfvars.

## Decisions no ADR covers

Atlas accepted these and they stay:

- Region `northeurope`.
- PostgreSQL 16. The provider also offers 17 and 18. No ADR pins the major version. 16 matches the PostGIS line the API tests are aimed at.
- Entra-only Postgres, with the API identity as an administrator (v1 debt), and the Azure-services firewall rule instead of a VNet.
- No VNet, private endpoint, or NAT gateway.
- Partial remote backend, with `use_azuread_auth = true` committed and the storage account not created here.

Also recorded here:

- Images live in GHCR, not ACR. A public package needs no pull secret. A private package uses a Key Vault reference, not a secret value in Terraform.
- No Application Insights resource. Log Analytics is the log sink, with a daily cap.
- The placeholder container image and port 8080. Replace the image before any apply.
- Key Vault purge protection is off. A later prod copy can turn it on, and that choice cannot be reversed, so it is not in this root.
