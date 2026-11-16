# Log sink for the Container Apps environment.
# Retention stays at 30 days: PerGB2018 includes that window, and longer retention is a separate charge.
# The daily cap is what stops a chatty app from running the bill up. There is no Application Insights resource.

resource "azurerm_log_analytics_workspace" "this" {
  name                = var.name
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  daily_quota_gb      = var.daily_quota_gb
  tags                = var.tags
}
