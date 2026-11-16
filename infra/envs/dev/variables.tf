variable "subscription_id" {
  type        = string
  description = "Azure subscription id. Not a secret. Required before any future apply. This configuration is not applied from CI."

  validation {
    condition     = can(regex("(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", var.subscription_id))
    error_message = "subscription_id must be a UUID."
  }
}

variable "tenant_id" {
  type        = string
  description = "Entra tenant id. Not a secret."

  validation {
    condition     = can(regex("(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", var.tenant_id))
    error_message = "tenant_id must be a UUID."
  }
}

variable "uniqueness_suffix" {
  type        = string
  description = "Four lowercase letters or digits so globally unique names do not collide. Not a secret."

  validation {
    condition     = can(regex("^[a-z0-9]{4}$", var.uniqueness_suffix))
    error_message = "uniqueness_suffix must be exactly 4 lowercase letters or digits."
  }
}

variable "location" {
  type        = string
  description = "Azure region. Pinned to North Europe: no ADR names a region, and Tallinn is the product's home."
  default     = "northeurope"

  validation {
    condition     = var.location == "northeurope"
    error_message = "location must be northeurope. Another region is a reviewed change."
  }
}

variable "postgres_administrator_object_id" {
  type        = string
  description = "Object id of the break-glass Postgres Entra administrator. Use a group. Not a secret."

  validation {
    condition     = can(regex("(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", var.postgres_administrator_object_id))
    error_message = "postgres_administrator_object_id must be a UUID."
  }
}

variable "postgres_administrator_principal_name" {
  type        = string
  description = "Display name of the break-glass Postgres administrator. Not a secret."

  validation {
    condition     = length(var.postgres_administrator_principal_name) > 0
    error_message = "postgres_administrator_principal_name must be set."
  }
}

variable "postgres_administrator_principal_type" {
  type        = string
  description = "Group, User, or ServicePrincipal. Prefer Group."
  default     = "Group"

  validation {
    condition     = contains(["Group", "User", "ServicePrincipal"], var.postgres_administrator_principal_type)
    error_message = "postgres_administrator_principal_type must be Group, User, or ServicePrincipal."
  }
}

variable "oidc_authority" {
  type        = string
  description = "OIDC authority URL for the API (ADR 0005). Not a secret. Entra External ID is the default provider until Brenner picks."

  validation {
    condition     = can(regex("^https://", var.oidc_authority))
    error_message = "oidc_authority must be an https URL."
  }
}

variable "oidc_audience" {
  type        = string
  description = "OIDC audience for the API (ADR 0005). Not a secret."

  validation {
    condition     = length(var.oidc_audience) > 0
    error_message = "oidc_audience must be set."
  }
}

variable "key_vault_secret_environment_variables" {
  type        = map(string)
  description = "Optional map of app setting name to a versionless Key Vault secret URI. Do not put secret values in Terraform."
  default     = {}
}

variable "registry_server" {
  type        = string
  description = "Set to ghcr.io only for a private package. Leave null for a public image, including a public GHCR package. Not a secret."
  default     = null
}

variable "registry_username" {
  type        = string
  description = "GitHub user or org that owns the pull token. Required with registry_server. Not a secret."
  default     = null
}

variable "registry_password_key_vault_secret_id" {
  type        = string
  description = "Versionless Key Vault URI of the GHCR pull token. Required with registry_server. Never the token itself."
  default     = null
}

variable "key_vault_operator_object_id" {
  type        = string
  description = "Object id of the Entra group or user who administers Key Vault secrets. Not a secret. This principal creates the pull token out of band."

  validation {
    condition     = can(regex("(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", var.key_vault_operator_object_id))
    error_message = "key_vault_operator_object_id must be a UUID."
  }
}

variable "key_vault_operator_principal_type" {
  type        = string
  description = "Group, User, or ServicePrincipal. Prefer Group."
  default     = "Group"

  validation {
    condition     = contains(["Group", "User", "ServicePrincipal"], var.key_vault_operator_principal_type)
    error_message = "key_vault_operator_principal_type must be Group, User, or ServicePrincipal."
  }
}

variable "container_image" {
  type        = string
  description = "Image the API runs. The default is a public placeholder because Container Apps requires an image. Replace it with the Happengo image on GHCR before any apply."
  default     = "mcr.microsoft.com/k8se/quickstart:latest"
}

variable "container_port" {
  type        = number
  description = "Container port. 8080 matches ASPNETCORE_HTTP_PORTS. The placeholder image does not listen here."
  default     = 8080
}

variable "postgres_allow_azure_services" {
  type        = bool
  description = "Allow the Azure-services firewall rule (0.0.0.0 to 0.0.0.0). This is not the public internet. It is how Consumption Container Apps reach Postgres without a VNet."
  default     = true
}

variable "postgres_firewall_rules" {
  type = list(object({
    name     = string
    start_ip = string
    end_ip   = string
  }))
  description = "Extra operator IP ranges. Empty by default. Do not open 0.0.0.0/0."
  default     = []
}

# Dev defaults. Smallest burstable database, smallest Consumption container, tight log cap.
# None of these are applied by CI. Purge protection stays off: once enabled it cannot be turned off,
# which is one reason a prod root is not checked in yet.

variable "postgres_sku_name" {
  type        = string
  description = "Burstable Flexible Server SKU. Dev uses the smallest, B_Standard_B1ms."
  default     = "B_Standard_B1ms"
}

variable "postgres_backup_retention_days" {
  type        = number
  description = "Backup retention in days. Dev keeps the minimum, 7. Geo-redundant backup is not available in this layout."
  default     = 7
}

variable "log_daily_quota_gb" {
  type        = number
  description = "Log Analytics daily ingestion cap in GB. Dev default is 0.1."
  default     = 0.1
}

variable "container_cpu" {
  type        = number
  description = "API vCPU on the Consumption plan. Dev default is 0.25."
  default     = 0.25
}

variable "container_memory" {
  type        = string
  description = "API memory on the Consumption plan. Dev default is 0.5Gi, the pair for 0.25 vCPU."
  default     = "0.5Gi"
}

variable "container_min_replicas" {
  type        = number
  description = "Minimum API replicas. 0 scales to zero."
  default     = 0
}

variable "container_max_replicas" {
  type        = number
  description = "Maximum API replicas. Dev default is 1."
  default     = 1
}

variable "key_vault_purge_protection_enabled" {
  type        = bool
  description = "Key Vault purge protection. Off in dev so a mistaken vault can be removed. Cannot be turned off once enabled."
  default     = false
}

variable "key_vault_soft_delete_retention_days" {
  type        = number
  description = "Key Vault soft-delete retention. Dev uses the minimum, 7 days. This can only be set once."
  default     = 7
}
