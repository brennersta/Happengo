# Container Apps on the Consumption workload profile, which is what scales to zero (ADR 0002).
# Zone redundancy is off. Turning it on requires a subnet of /23 or larger and is a networking spend decision.
# The identity is created by the environment root so role assignments and the Postgres administrator can share it
# without a module cycle. Secrets, when any exist, are Key Vault references read by that identity.

locals {
  consumption_memory = {
    "0.25" = "0.5Gi"
    "0.50" = "1Gi"
    "0.75" = "1.5Gi"
    "1.00" = "2Gi"
    "1.25" = "2.5Gi"
    "1.50" = "3Gi"
    "1.75" = "3.5Gi"
    "2.00" = "4Gi"
  }

  cpu_key = format("%.2f", var.container_cpu)

  key_vault_secrets = {
    for env_name, secret_id in var.key_vault_secret_environment_variables :
    env_name => {
      secret_name = replace(lower(env_name), "_", "-")
      secret_id   = secret_id
    }
  }
}

resource "terraform_data" "guards" {
  input = {
    role_assignment_ids       = var.role_assignment_ids
    postgres_administrator_id = var.postgres_administrator_id
  }

  lifecycle {
    precondition {
      condition     = lookup(local.consumption_memory, local.cpu_key, "") == var.container_memory
      error_message = "Consumption requires a matched pair. ${var.container_cpu} vCPU uses ${lookup(local.consumption_memory, local.cpu_key, "an unsupported size")}, not ${var.container_memory}."
    }

    precondition {
      condition     = var.min_replicas <= var.max_replicas
      error_message = "min_replicas (${var.min_replicas}) must be less than or equal to max_replicas (${var.max_replicas})."
    }

    precondition {
      condition     = length(distinct([for secret in local.key_vault_secrets : secret.secret_name])) == length(local.key_vault_secrets)
      error_message = "Key Vault environment variable names collide once they are lowercased into Container Apps secret names."
    }
  }
}

resource "azurerm_container_app_environment" "this" {
  name                       = var.environment_name
  location                   = var.location
  resource_group_name        = var.resource_group_name
  log_analytics_workspace_id = var.log_analytics_workspace_id
  logs_destination           = "log-analytics"
  public_network_access      = "Enabled"

  # zone_redundancy_enabled defaults to false. Setting it, even to false, requires
  # infrastructure_subnet_id in azurerm 5.14. A subnet is a VNet spend decision and is not created here.

  workload_profile {
    name                  = "Consumption"
    workload_profile_type = "Consumption"
  }

  tags = var.tags
}

resource "azurerm_container_app" "api" {
  name                         = var.app_name
  resource_group_name          = var.resource_group_name
  container_app_environment_id = azurerm_container_app_environment.this.id
  revision_mode                = "Single"
  workload_profile_name        = "Consumption"

  identity {
    type         = "UserAssigned"
    identity_ids = [var.identity_id]
  }

  dynamic "registry" {
    for_each = var.acr_login_server == null ? [] : [var.acr_login_server]

    content {
      server   = registry.value
      identity = var.identity_id
    }
  }

  dynamic "secret" {
    for_each = local.key_vault_secrets

    content {
      name                = secret.value.secret_name
      identity            = var.identity_id
      key_vault_secret_id = secret.value.secret_id
    }
  }

  template {
    min_replicas = var.min_replicas
    max_replicas = var.max_replicas

    container {
      name   = "api"
      image  = var.container_image
      cpu    = var.container_cpu
      memory = var.container_memory

      dynamic "env" {
        for_each = var.environment_variables

        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = local.key_vault_secrets

        content {
          name        = env.key
          secret_name = env.value.secret_name
        }
      }
    }
  }

  ingress {
    external_enabled           = true
    allow_insecure_connections = false
    target_port                = var.container_port
    transport                  = "http"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  tags = var.tags

  depends_on = [terraform_data.guards]
}
