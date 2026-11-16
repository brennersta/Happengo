locals {
  # ADR 0002 is one deployed environment. This root is that environment.
  # Copy the directory only when a second one is actually needed, and change the guard with the copy.
  environment = basename(abspath(path.module))
  project     = "happengo"
  location    = var.location

  tags = {
    project     = local.project
    environment = local.environment
    managed_by  = "terraform"
  }

  location_short        = "neu"
  resource_group_name   = "rg-${local.project}-${local.environment}-${local.location_short}"
  identity_name         = "id-${local.project}-api-${local.environment}"
  log_analytics_name    = "log-${local.project}-${local.environment}"
  container_environment = "cae-${local.project}-${local.environment}"
  container_app_name    = "ca-${local.project}-api-${local.environment}"
  postgres_server_name  = "psql-${local.project}-${local.environment}-${var.uniqueness_suffix}"
  key_vault_name        = "kv-${local.project}-${local.environment}-${var.uniqueness_suffix}"
  storage_account_name  = "st${local.project}${local.environment}${var.uniqueness_suffix}"

  aspnetcore_environment = {
    dev = "Development"
  }
}
