# Private blob containers for event covers and album photos (ADR 0008).
# Shared keys are off, so the API must issue user-delegation SAS with its managed identity.
# Clients still upload from the internet, so the account allows public network access while the containers stay private.
# LRS is not zone-redundant. ZRS, GRS, and geo-zone replication are a spend decision and are not accepted here.

resource "azurerm_storage_account" "this" {
  name                             = var.name
  resource_group_name              = var.resource_group_name
  location                         = var.location
  account_kind                     = "StorageV2"
  account_tier                     = "Standard"
  account_replication_type         = "LRS"
  access_tier                      = "Hot"
  min_tls_version                  = "TLS1_2"
  https_traffic_only_enabled       = true
  allow_nested_items_to_be_public  = false
  shared_access_key_enabled        = false
  public_network_access            = "Enabled"
  local_user_enabled               = false
  cross_tenant_replication_enabled = false

  blob_properties {
    delete_retention_policy {
      days = 7
    }

    container_delete_retention_policy {
      days = 7
    }
  }

  tags = var.tags
}

resource "azurerm_storage_container" "photos" {
  for_each = toset(["covers", "albums"])

  name                  = each.value
  storage_account_id    = azurerm_storage_account.this.id
  container_access_type = "private"
}
