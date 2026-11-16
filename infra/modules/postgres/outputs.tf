output "id" {
  description = "ARM id of the Flexible Server."
  value       = azurerm_postgresql_flexible_server.this.id
}

output "name" {
  description = "Server name."
  value       = azurerm_postgresql_flexible_server.this.name
}

output "fqdn" {
  description = "Server FQDN. The API receives this as configuration, not as a secret."
  value       = azurerm_postgresql_flexible_server.this.fqdn
}

output "database_name" {
  description = "Application database name."
  value       = azurerm_postgresql_flexible_server_database.happengo.name
}

output "entra_administrator_ids" {
  description = "Ids of the break-glass Entra administrators created by this module."
  value       = [for admin in azurerm_postgresql_flexible_server_active_directory_administrator.this : admin.id]
}
