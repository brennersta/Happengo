variable "name" {
  type        = string
  description = "Flexible Server name. Globally unique."

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$", var.name))
    error_message = "PostgreSQL server name must be 3-63 characters, lowercase letters, digits, and hyphens, and must not start or end with a hyphen."
  }
}

variable "resource_group_name" {
  type        = string
  description = "Resource group the server is created in."
}

variable "location" {
  type        = string
  description = "Azure region."
}

variable "tenant_id" {
  type        = string
  description = "Entra tenant id used for database authentication. Not a secret."

  validation {
    condition     = can(regex("(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", var.tenant_id))
    error_message = "tenant_id must be a UUID."
  }
}

variable "sku_name" {
  type        = string
  description = "Burstable SKU. ADR 0002 keeps PostgreSQL on the Burstable tier. B_Standard_B1ms is the smallest."

  validation {
    condition     = startswith(var.sku_name, "B_")
    error_message = "sku_name must be a Burstable SKU (B_*). General Purpose and Memory Optimized are a spend decision this module does not accept."
  }
}

variable "backup_retention_days" {
  type        = number
  description = "Backup retention. Azure allows 7 to 35 days. Geo-redundant backup is not enabled."

  validation {
    condition     = var.backup_retention_days >= 7 && var.backup_retention_days <= 35
    error_message = "backup_retention_days must be between 7 and 35."
  }
}

variable "allow_azure_services" {
  type        = bool
  description = "When true, add the 0.0.0.0 firewall rule that means 'Azure services', not the public internet. Required for Consumption Container Apps without a VNet."
}

variable "firewall_rules" {
  type = list(object({
    name     = string
    start_ip = string
    end_ip   = string
  }))
  description = "Operator IP ranges. A rule of 0.0.0.0-255.255.255.255 is rejected."
  default     = []

  validation {
    condition = alltrue([
      for rule in var.firewall_rules :
      !(rule.start_ip == "0.0.0.0" && (rule.end_ip == "255.255.255.255" || rule.end_ip == "0.0.0.0"))
    ])
    error_message = "Do not open PostgreSQL to the whole internet, and do not duplicate the Azure-services rule. Use allow_azure_services for 0.0.0.0-0.0.0.0."
  }
}

variable "entra_administrators" {
  type = list(object({
    object_id      = string
    principal_name = string
    principal_type = string
  }))
  description = "Break-glass Entra administrators. Not passwords. The API identity is added by the environment root."

  validation {
    condition     = length(var.entra_administrators) > 0
    error_message = "At least one Entra administrator is required because password authentication is disabled."
  }

  validation {
    condition = alltrue([
      for admin in var.entra_administrators :
      contains(["Group", "User", "ServicePrincipal"], admin.principal_type)
    ])
    error_message = "principal_type must be Group, User, or ServicePrincipal."
  }
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to the server."
}
