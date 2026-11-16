variable "name" {
  type        = string
  description = "Key Vault name. Globally unique, 3-24 characters."

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9-]{1,22}[a-zA-Z0-9]$", var.name))
    error_message = "Key Vault name must be 3-24 characters, start with a letter, and end with a letter or digit."
  }
}

variable "resource_group_name" {
  type        = string
  description = "Resource group the vault is created in."
}

variable "location" {
  type        = string
  description = "Azure region."
}

variable "tenant_id" {
  type        = string
  description = "Entra tenant id. Not a secret."

  validation {
    condition     = can(regex("(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", var.tenant_id))
    error_message = "tenant_id must be a UUID."
  }
}

variable "purge_protection_enabled" {
  type        = bool
  description = "Once true, purge protection cannot be turned off. Prod only."
}

variable "soft_delete_retention_days" {
  type        = number
  description = "Soft-delete retention. Can be set once, between 7 and 90 days."

  validation {
    condition     = var.soft_delete_retention_days >= 7 && var.soft_delete_retention_days <= 90
    error_message = "soft_delete_retention_days must be between 7 and 90."
  }
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to the vault."
}
