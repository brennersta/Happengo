variable "name" {
  type        = string
  description = "Registry name. Alphanumeric, globally unique."

  validation {
    condition     = can(regex("^[a-zA-Z0-9]{5,50}$", var.name))
    error_message = "ACR name must be 5-50 alphanumeric characters."
  }
}

variable "resource_group_name" {
  type        = string
  description = "Resource group the registry is created in."
}

variable "location" {
  type        = string
  description = "Azure region."
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to the registry."
}
