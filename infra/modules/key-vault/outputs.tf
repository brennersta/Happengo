output "id" {
  description = "ARM id of the Key Vault."
  value       = azurerm_key_vault.this.id
}

output "name" {
  description = "Vault name."
  value       = azurerm_key_vault.this.name
}

output "vault_uri" {
  description = "Vault URI. The API receives this as configuration, not as a secret."
  value       = azurerm_key_vault.this.vault_uri
}
