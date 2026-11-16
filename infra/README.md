# Infrastructure

`infra/` will hold Terraform for the Azure resources:

- Container Apps environment and the API app (consumption plan, scale to zero)
- Azure Database for PostgreSQL Flexible Server, Burstable, with PostGIS
- Storage account
- Key Vault
- Log Analytics

Owned by QA & DevOps.

Nothing is applied yet. This directory has no Terraform configuration and does not create cloud resources. Apply waits until Brenner approves a deployed environment ([ADR 0002](../docs/adr/0002-stack-and-modular-monolith.md)).
