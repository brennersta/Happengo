variable "environment_name" {
  type        = string
  description = "Container Apps environment name."
}

variable "app_name" {
  type        = string
  description = "API container app name."
}

variable "resource_group_name" {
  type        = string
  description = "Resource group the environment and app are created in."
}

variable "location" {
  type        = string
  description = "Azure region."
}

variable "log_analytics_workspace_id" {
  type        = string
  description = "ARM id of the Log Analytics workspace the environment ships logs to."
}

variable "identity_id" {
  type        = string
  description = "Resource id of the user-assigned identity the API runs as."
}

variable "identity_client_id" {
  type        = string
  description = "Client id of that identity. Passed to the app as AZURE_CLIENT_ID. Not a secret."
}

variable "container_image" {
  type        = string
  description = "Container image. Container Apps requires one. Replace the placeholder with the API image before any apply that should serve traffic."
}

variable "container_port" {
  type        = number
  description = "Ingress target port. 8080 is the intended ASP.NET port."

  validation {
    condition     = var.container_port > 0 && var.container_port < 65536
    error_message = "container_port must be a TCP port."
  }
}

variable "container_cpu" {
  type        = number
  description = "vCPU for the Consumption plan. Must match container_memory."
}

variable "container_memory" {
  type        = string
  description = "Memory for the Consumption plan, such as 0.5Gi. Must match container_cpu."
}

variable "min_replicas" {
  type        = number
  description = "Minimum replicas. 0 scales to zero, which ADR 0002 accepts (cold start)."

  validation {
    condition     = var.min_replicas >= 0 && var.min_replicas <= 10
    error_message = "min_replicas must be between 0 and 10."
  }
}

variable "max_replicas" {
  type        = number
  description = "Maximum replicas. Capped at 10 so a typo cannot scale the bill out."

  validation {
    condition     = var.max_replicas >= 1 && var.max_replicas <= 10
    error_message = "max_replicas must be between 1 and 10."
  }
}

variable "acr_login_server" {
  type        = string
  default     = null
  description = "When set, the app pulls from this registry with its managed identity. Leave null while the image is a public placeholder."
}

variable "environment_variables" {
  type        = map(string)
  description = "Non-secret configuration. Do not put secret values here."
  default     = {}
}

variable "key_vault_secret_environment_variables" {
  type        = map(string)
  description = "Environment variable name to a versionless Key Vault secret id. The secret value is never a Terraform variable."
  default     = {}

  validation {
    condition = alltrue([
      for id in values(var.key_vault_secret_environment_variables) :
      can(regex("^https://[a-z0-9-]+\\.vault\\.azure\\.net/secrets/[A-Za-z0-9-]+$", id))
    ])
    error_message = "Each entry must be a versionless Key Vault secret URI (https://<vault>.vault.azure.net/secrets/<name>), never the secret value."
  }

  validation {
    condition = alltrue([
      for name in keys(var.key_vault_secret_environment_variables) :
      can(regex("^[A-Za-z][A-Za-z0-9_]*$", name))
    ])
    error_message = "Secret environment variable names must start with a letter and contain only letters, digits, and underscores."
  }
}

variable "role_assignment_ids" {
  type        = list(string)
  description = "Role assignments that must exist before the app is created. Used only for ordering."
  default     = []
}

variable "postgres_administrator_id" {
  type        = string
  description = "API Entra administrator resource id. Used only so the app is not created before it can sign in."
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to the environment and the app."
}
