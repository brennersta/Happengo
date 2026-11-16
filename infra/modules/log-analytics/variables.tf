variable "name" {
  type        = string
  description = "Log Analytics workspace name."
}

variable "resource_group_name" {
  type        = string
  description = "Resource group the workspace is created in."
}

variable "location" {
  type        = string
  description = "Azure region."
}

variable "daily_quota_gb" {
  type        = number
  description = "Daily ingestion cap in GB. Must be positive. -1 is unlimited and is rejected."

  validation {
    condition     = var.daily_quota_gb > 0 && var.daily_quota_gb <= 5
    error_message = "daily_quota_gb must be greater than 0 and at most 5. Unlimited ingestion is not allowed."
  }
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to the workspace."
}
