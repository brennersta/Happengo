# Basic is the smallest registry SKU. Admin login stays off; the API pulls with a managed identity (AcrPull).
# Premium would be required for private link or geo-replication. Neither is in this layout.

resource "azurerm_container_registry" "this" {
  name                          = var.name
  resource_group_name           = var.resource_group_name
  location                      = var.location
  sku                           = "Basic"
  admin_enabled                 = false
  public_network_access_enabled = true
  tags                          = var.tags
}
