output "environment_id" {
  description = "ARM id of the Container Apps environment."
  value       = azurerm_container_app_environment.this.id
}

output "app_id" {
  description = "ARM id of the API container app."
  value       = azurerm_container_app.api.id
}

output "fqdn" {
  description = "Public HTTPS hostname of the API. The platform certificate is on the default domain."
  value       = azurerm_container_app.api.ingress[0].fqdn
}
