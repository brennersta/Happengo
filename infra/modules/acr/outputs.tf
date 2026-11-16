output "id" {
  description = "ARM id of the registry."
  value       = azurerm_container_registry.this.id
}

output "name" {
  description = "Registry name."
  value       = azurerm_container_registry.this.name
}

output "login_server" {
  description = "Login server, for a later image push. This layout does not push an image."
  value       = azurerm_container_registry.this.login_server
}
