# Standard SKU, RBAC authorization, no access policies.
# This module does not create secret values. Callers reference secrets by id.
# Premium (HSM) and private endpoints are not used.

resource "azurerm_key_vault" "this" {
  name                            = var.name
  location                        = var.location
  resource_group_name             = var.resource_group_name
  tenant_id                       = var.tenant_id
  sku_name                        = "standard"
  rbac_authorization_enabled      = true
  purge_protection_enabled        = var.purge_protection_enabled
  soft_delete_retention_days      = var.soft_delete_retention_days
  public_network_access_enabled   = true
  enabled_for_deployment          = false
  enabled_for_disk_encryption     = false
  enabled_for_template_deployment = false
  tags                            = var.tags
}
