# Partial backend. The state storage account is not created by this root.
# resource_group_name, storage_account_name, container_name, and key are
# supplied with -backend-config when someone is allowed to init for real.
# CI and local checks use init -backend=false, which ignores this block.
# use_azuread_auth stays here so state access does not use a storage account key.

terraform {
  backend "azurerm" {
    use_azuread_auth = true
  }
}
