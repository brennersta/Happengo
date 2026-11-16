variable "name" {
  type        = string
  description = "Storage account name. Globally unique, 3-24 lowercase letters and digits."

  validation {
    condition     = can(regex("^[a-z0-9]{3,24}$", var.name))
    error_message = "Storage account name must be 3-24 lowercase letters or digits."
  }
}

variable "resource_group_name" {
  type        = string
  description = "Resource group the account is created in."
}

variable "location" {
  type        = string
  description = "Azure region."
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to the account."
}
