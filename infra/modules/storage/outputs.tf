output "id" {
  description = "ARM id of the storage account."
  value       = azurerm_storage_account.this.id
}

output "name" {
  description = "Storage account name."
  value       = azurerm_storage_account.this.name
}

output "primary_blob_endpoint" {
  description = "Blob service endpoint. The API receives this as configuration, not as a secret."
  value       = azurerm_storage_account.this.primary_blob_endpoint
}

output "covers_container_name" {
  description = "Private container for event covers."
  value       = azurerm_storage_container.photos["covers"].name
}

output "albums_container_name" {
  description = "Private container for album photos."
  value       = azurerm_storage_container.photos["albums"].name
}
