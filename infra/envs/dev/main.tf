resource "terraform_data" "name_limits" {
  lifecycle {
    precondition {
      condition     = contains(["dev", "staging", "prod"], local.environment)
      error_message = "Environment roots must live in infra/envs/dev, infra/envs/staging, or infra/envs/prod."
    }

    precondition {
      condition     = length(local.key_vault_name) >= 3 && length(local.key_vault_name) <= 24
      error_message = "Key Vault name ${local.key_vault_name} must be 3-24 characters."
    }

    precondition {
      condition     = length(local.storage_account_name) >= 3 && length(local.storage_account_name) <= 24
      error_message = "Storage account name ${local.storage_account_name} must be 3-24 characters."
    }
  }
}

resource "azurerm_resource_group" "this" {
  name     = local.resource_group_name
  location = local.location
  tags     = local.tags
}

resource "azurerm_user_assigned_identity" "api" {
  name                = local.identity_name
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  tags                = local.tags
}

module "log_analytics" {
  source = "../../modules/log-analytics"

  name                = local.log_analytics_name
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  daily_quota_gb      = var.log_daily_quota_gb
  tags                = local.tags
}

module "acr" {
  source = "../../modules/acr"

  name                = local.container_registry_name
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  tags                = local.tags
}

module "key_vault" {
  source = "../../modules/key-vault"

  name                       = local.key_vault_name
  resource_group_name        = azurerm_resource_group.this.name
  location                   = azurerm_resource_group.this.location
  tenant_id                  = var.tenant_id
  purge_protection_enabled   = var.key_vault_purge_protection_enabled
  soft_delete_retention_days = var.key_vault_soft_delete_retention_days
  tags                       = local.tags
}

module "storage" {
  source = "../../modules/storage"

  name                = local.storage_account_name
  resource_group_name = azurerm_resource_group.this.name
  location            = azurerm_resource_group.this.location
  tags                = local.tags
}

module "postgres" {
  source = "../../modules/postgres"

  name                  = local.postgres_server_name
  resource_group_name   = azurerm_resource_group.this.name
  location              = azurerm_resource_group.this.location
  tenant_id             = var.tenant_id
  sku_name              = var.postgres_sku_name
  backup_retention_days = var.postgres_backup_retention_days
  allow_azure_services  = var.postgres_allow_azure_services
  firewall_rules        = var.postgres_firewall_rules
  tags                  = local.tags

  entra_administrators = [
    {
      object_id      = var.postgres_administrator_object_id
      principal_name = var.postgres_administrator_principal_name
      principal_type = var.postgres_administrator_principal_type
    }
  ]
}

# The API signs in to Postgres as this identity. It is an Entra administrator because
# Flexible Server has no separate Terraform resource for a non-admin database principal.
# Password authentication is disabled, so there is no database password to store.
resource "azurerm_postgresql_flexible_server_active_directory_administrator" "api" {
  server_name         = module.postgres.name
  resource_group_name = azurerm_resource_group.this.name
  tenant_id           = var.tenant_id
  object_id           = azurerm_user_assigned_identity.api.principal_id
  principal_name      = azurerm_user_assigned_identity.api.name
  principal_type      = "ServicePrincipal"

  depends_on = [module.postgres]
}

resource "azurerm_role_assignment" "acr_pull" {
  scope                            = module.acr.id
  role_definition_name             = "AcrPull"
  principal_id                     = azurerm_user_assigned_identity.api.principal_id
  principal_type                   = "ServicePrincipal"
  skip_service_principal_aad_check = true
}

resource "azurerm_role_assignment" "blob_data" {
  scope                            = module.storage.id
  role_definition_name             = "Storage Blob Data Contributor"
  principal_id                     = azurerm_user_assigned_identity.api.principal_id
  principal_type                   = "ServicePrincipal"
  skip_service_principal_aad_check = true
}

resource "azurerm_role_assignment" "key_vault_secrets" {
  scope                            = module.key_vault.id
  role_definition_name             = "Key Vault Secrets User"
  principal_id                     = azurerm_user_assigned_identity.api.principal_id
  principal_type                   = "ServicePrincipal"
  skip_service_principal_aad_check = true
}

module "container_apps" {
  source = "../../modules/container-apps"

  environment_name           = local.container_environment
  app_name                   = local.container_app_name
  resource_group_name        = azurerm_resource_group.this.name
  location                   = azurerm_resource_group.this.location
  log_analytics_workspace_id = module.log_analytics.id
  identity_id                = azurerm_user_assigned_identity.api.id
  identity_client_id         = azurerm_user_assigned_identity.api.client_id
  container_image            = var.container_image
  container_port             = var.container_port
  container_cpu              = var.container_cpu
  container_memory           = var.container_memory
  min_replicas               = var.container_min_replicas
  max_replicas               = var.container_max_replicas
  acr_login_server           = var.acr_login_server
  tags                       = local.tags

  role_assignment_ids = [
    azurerm_role_assignment.acr_pull.id,
    azurerm_role_assignment.blob_data.id,
    azurerm_role_assignment.key_vault_secrets.id,
  ]
  postgres_administrator_id = azurerm_postgresql_flexible_server_active_directory_administrator.api.id

  key_vault_secret_environment_variables = var.key_vault_secret_environment_variables

  environment_variables = {
    AZURE_CLIENT_ID           = azurerm_user_assigned_identity.api.client_id
    ASPNETCORE_ENVIRONMENT    = local.aspnetcore_environment[local.environment]
    ASPNETCORE_HTTP_PORTS     = tostring(var.container_port)
    Authentication__Authority = var.oidc_authority
    Authentication__Audience  = var.oidc_audience
    POSTGRES_HOST             = module.postgres.fqdn
    POSTGRES_DATABASE         = module.postgres.database_name
    POSTGRES_USERNAME         = azurerm_user_assigned_identity.api.name
    BLOB_ACCOUNT_URL          = module.storage.primary_blob_endpoint
    BLOB_CONTAINER_COVERS     = module.storage.covers_container_name
    BLOB_CONTAINER_ALBUMS     = module.storage.albums_container_name
    KEY_VAULT_URI             = module.key_vault.vault_uri
  }
}
