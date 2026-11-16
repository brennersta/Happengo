output "resource_group_name" {
  description = "Resource group for this environment."
  value       = azurerm_resource_group.this.name
}

output "container_app_fqdn" {
  description = "Public hostname of the API."
  value       = module.container_apps.fqdn
}

output "postgres_fqdn" {
  description = "PostgreSQL hostname. Not a secret."
  value       = module.postgres.fqdn
}

output "key_vault_uri" {
  description = "Key Vault URI."
  value       = module.key_vault.vault_uri
}

output "blob_endpoint" {
  description = "Blob service endpoint."
  value       = module.storage.primary_blob_endpoint
}

output "api_identity_client_id" {
  description = "Client id of the API managed identity. Not a secret."
  value       = azurerm_user_assigned_identity.api.client_id
}
