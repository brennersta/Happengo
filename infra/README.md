# Infrastructure

Terraform for Happengo's Azure resources. Nothing here has been applied. `terraform plan` and `terraform apply` are not part of CI, and they are not a step in this layout. Brenner approves spend before any environment is provisioned. [ADR 0002](../docs/adr/0002-stack-and-modular-monolith.md) is the hosting decision this tree follows.

The AzureRM provider is `~> 5.14` (locked at 5.14.0). Terraform is `>= 1.17.2, < 2.0.0`, which is the 1.17.2 pin in CI.

## Layout

```
infra/
  modules/
    acr/              # Azure Container Registry, Basic, admin disabled
    container-apps/   # Consumption environment and the API app
    key-vault/        # Standard vault, RBAC, no secret values
    log-analytics/    # Log Analytics workspace, PerGB2018, daily cap
    postgres/         # Flexible Server, Burstable, PostGIS allow-listed
    storage/          # Blob account, private covers and albums containers
  envs/
    dev/
    staging/
    prod/
```

Each environment root is the same composition. `local.environment` is the directory name (`dev`, `staging`, or `prod`). The user-assigned identity, resource group, and role assignments live in the root because they cross modules: the API identity pulls from the registry, reads blobs, reads Key Vault, and is a Postgres Entra administrator.

There is no VNet module. Private endpoints, NAT, and zone-redundant networking are not in this layout.

The Log Analytics module is `log-analytics`, not `logs`. The root `.gitignore` ignores every `logs/` directory so .NET build output stays untracked.

## What an environment contains

| Piece | Module or root | Notes |
|---|---|---|
| Resource group | root | `rg-happengo-<env>-neu` |
| User-assigned identity | root | `id-happengo-api-<env>`. The API runs as this identity. |
| Log Analytics | `modules/log-analytics` | Container Apps ships stdout here. No Application Insights resource. |
| Container Registry | `modules/acr` | Basic. The API is granted `AcrPull`. This tree does not push an image. |
| Key Vault | `modules/key-vault` | Standard, RBAC. No secret values are created. |
| Blob storage | `modules/storage` | Private containers `covers` and `albums` ([ADR 0008](../docs/adr/0008-image-storage.md)). |
| PostgreSQL | `modules/postgres` | Flexible Server 16, Burstable, database `happengo`. |
| API app | `modules/container-apps` | Consumption, external HTTPS, scale to zero. |

Names that must be globally unique append `uniqueness_suffix` (4 lowercase letters or digits) from tfvars: the storage account, the registry, the vault, and the Postgres server. Example for dev with suffix `dev1`: `sthappengodevdev1`, `acrhappengodevdev1`, `kv-happengo-dev-dev1`, `psql-happengo-dev-dev1`.

Region is `northeurope` (`neu` in resource group names). No ADR names a region. North Europe is the Azure region used from Tallinn. The variable rejects anything else.

## Environments

[ADR 0002](../docs/adr/0002-stack-and-modular-monolith.md) says v1 is local development plus one deployed environment, and that a second deployed environment waits until the first is in use. The three roots exist so the layout is ready. Applying `staging` or `prod` before dev is in use breaks that decision. Prod Key Vault purge protection cannot be turned off after it is enabled. Do not apply any root until Brenner approves that environment.

Copy `terraform.tfvars.example` to `terraform.tfvars` only at that point. `terraform.tfvars` is gitignored. The example file has placeholders, not real ids, and no secret values.

## Identity, secrets, Postgres, blobs

There are no secret variables. Subscription id, tenant id, the break-glass admin's object id, and the OIDC authority and audience are identifiers ([ADR 0005](../docs/adr/0005-authentication.md)). The API reads `Authentication__Authority` and `Authentication__Audience` from ordinary environment variables.

PostgreSQL password authentication is off. There is no administrator password in variables, in Key Vault, or in this configuration. A break-glass Entra principal (prefer a group) is an administrator, and so is the API's managed identity. Flexible Server has no Terraform resource for a non-admin database user, so the API identity is an administrator. That is broader than a normal login. Narrow it when migrations can run `pgaadauth_create_principal` as the break-glass admin.

The app's non-secret settings include `AZURE_CLIENT_ID`, `POSTGRES_HOST`, `POSTGRES_DATABASE`, `POSTGRES_USERNAME` (the identity name), `BLOB_ACCOUNT_URL`, the two container names, and `KEY_VAULT_URI`. It signs in with the managed identity. No password is set.

Key Vault references are the only way a secret reaches the app. `key_vault_secret_environment_variables` maps a setting name to a versionless secret URI (`https://<vault>.vault.azure.net/secrets/<name>`). The value itself is rejected by validation. The identity has Key Vault Secrets User. Nothing in this tree creates a secret. A geocoding provider key ([ADR 0006](../docs/adr/0006-geo-queries.md) is still open) would be created in the vault out of band and then referenced.

Blob containers are private ([ADR 0008](../docs/adr/0008-image-storage.md)). Shared keys are disabled, so account-key SAS will not work. The API issues a user-delegation SAS with Storage Blob Data Contributor, which includes `generateUserDelegationKey`. The account still allows public network access because the client uploads directly. A guessed URL must not return the object. That is the container access level, not a public network flag.

PostGIS is allow-listed with the server parameter `azure.extensions=POSTGIS`. `CREATE EXTENSION postgis` belongs in the API migration, not here. GiST indexes are part of that migration ([ADR 0003](../docs/adr/0003-data-model.md), [ADR 0006](../docs/adr/0006-geo-queries.md)).

The container image defaults to `mcr.microsoft.com/k8se/quickstart:latest` because Container Apps requires an image. The ingress port is 8080, which is what `ASPNETCORE_HTTP_PORTS` sets for the real API. The placeholder does not listen on 8080. Do not apply expecting a healthy API until the image is the Happengo API. Point `acr_login_server` at this environment's registry when the image moves into ACR. The identity already has AcrPull.

## Networking

No VNet, subnet, private DNS zone, private endpoint, or NAT gateway. Those cost more than the API at v1, and no ADR requires them.

Postgres is reached on the public endpoint. The firewall rule named `allow-azure-services` is `0.0.0.0`–`0.0.0.0`. In Azure that means "Azure services", not the public internet. A rule of `0.0.0.0`–`255.255.255.255` is rejected. Consumption Container Apps do not have a stable outbound IP, so this is how the API reaches Postgres without a VNet. The compensating control is Entra-only authentication: there is no database password. Any extra operator range goes in `postgres_firewall_rules`.

Container Apps zone redundancy stays off. In azurerm 5.14, setting `zone_redundancy_enabled` at all requires `infrastructure_subnet_id`, which would create the VNet dependency this layout defers.

## Remote state

Each root declares an `azurerm` backend and sets `use_azuread_auth = true`, so state is not read with a storage account key. The rest of the backend is partial on purpose. These values are not in the committed config, because the state storage account is a separate Azure cost and this tree does not create it:

| Backend setting | Who supplies it | Suggested value |
|---|---|---|
| `resource_group_name` | `-backend-config` | a resource group created only after spend is approved |
| `storage_account_name` | `-backend-config` | a globally unique Standard LRS account, not managed here |
| `container_name` | `-backend-config` | `tfstate` |
| `key` | `-backend-config` | `dev.terraform.tfstate`, `staging.terraform.tfstate`, or `prod.terraform.tfstate` |
| `use_azuread_auth` | committed backend block | `true` |

`terraform init -backend=false` skips this block. That is what CI runs, and it is the local check below. A real `terraform init` without `-backend=false` will prompt for the missing settings. Do not run that, and do not create the state account, until Brenner approves it.

Once a root is applied, state will hold Log Analytics shared keys because the Container Apps environment integration reads them. That is another reason not to apply until remote state exists and access to it is limited. State files are gitignored. Do not commit them.

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

Prices are not listed. They move, and this pull request does not apply anything. The dev column is the default in `infra/envs/dev`.

| What is billed | Terraform resource | Dev default |
|---|---|---|
| PostgreSQL Flexible Server compute | `azurerm_postgresql_flexible_server` | Burstable `B_Standard_B1ms`, one zone, high availability off, Entra auth only |
| PostgreSQL storage | same server | 32 GiB `Premium_LRS`, tier `P4`, auto-grow off |
| PostgreSQL backup | same server | 7 days, geo-redundant backup off |
| Container Apps environment | `azurerm_container_app_environment` | Consumption workload profile, zone redundancy off, logs to Log Analytics |
| API container app | `azurerm_container_app` | Consumption, 0.25 vCPU, 0.5 Gi, 0–1 replicas |
| Container Registry | `azurerm_container_registry` | `Basic`, admin user off |
| Blob storage | `azurerm_storage_account` | `Standard` / `LRS` / `Hot`, TLS 1.2, shared keys off |
| Key Vault | `azurerm_key_vault` | `standard`, RBAC, purge protection off, soft-delete 7 days |
| Log Analytics | `azurerm_log_analytics_workspace` | `PerGB2018`, retention 30 days, daily cap 0.1 GB |

These are created with an environment and do not have a separate meter: the resource group, the user-assigned identity, the three role assignments (`AcrPull`, `Storage Blob Data Contributor`, `Key Vault Secrets User`), the `happengo` database, the `azure.extensions` setting, firewall rules, Entra administrator records, and the `covers` and `albums` containers. Blob soft-delete is 7 days and is billed as stored data on the storage account, not as another resource.

Egress is usage on the resources above, not its own resource.

[ADR 0002](../docs/adr/0002-stack-and-modular-monolith.md) says the Burstable server can be stopped while idle. Stopping pauses compute. Storage and backup still bill. This layout does not stop the server for you.

Not created here, so not in the table: the remote state storage account, any VNet or private endpoint or NAT gateway, Application Insights, a larger Postgres tier, zone-redundant or geo-redundant SKUs, and a map or geocoding provider.

### Staging and prod defaults

Still Burstable `B_Standard_B1ms`, 32 GiB `P4`, ACR `Basic`, storage `Standard_LRS`, scale to zero, no zone redundancy. The differences:

| Setting | dev | staging | prod |
|---|---|---|---|
| API size | 0.25 vCPU, 0.5 Gi, max 1 replica | 0.5 vCPU, 1 Gi, max 2 | 0.5 vCPU, 1 Gi, max 3 |
| Backup retention | 7 days | 7 days | 14 days |
| Log Analytics daily cap | 0.1 GB | 0.5 GB | 1 GB |
| Key Vault purge protection | off | off | on (cannot be disabled later) |
| Key Vault soft-delete | 7 days | 7 days | 90 days |

The Postgres module only accepts a `B_*` SKU. Registry SKU is hardcoded to Basic. Storage replication is hardcoded to LRS. Log retention is hardcoded to 30 days. Daily cap must be greater than 0 and at most 5 GB, so unlimited ingestion (`-1`) cannot be set in tfvars.

## Decisions no ADR covers

Recorded here so they are not only in the pull request:

- Region `northeurope`.
- PostgreSQL 16, matching the PostGIS major the API tests are expected to use. The provider also offers 17 and 18. No ADR pins the major version.
- Entra-only Postgres, the API identity as an administrator, and the Azure-services firewall rule instead of a VNet.
- ACR is in this tree because images have to live somewhere. ADR 0002 does not name the registry.
- No Application Insights resource. Log Analytics is the log sink, with a daily cap.
- Prod is not zone-redundant and stays on `B_Standard_B1ms`. Durability differences are backup days and Key Vault retention.
- The placeholder container image and port 8080, as above.
- Key Vault purge protection only in prod. The QA plan suggested that. No ADR mentions purge protection.
