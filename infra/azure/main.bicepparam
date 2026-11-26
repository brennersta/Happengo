using './main.bicep'

param location = 'northeurope'
param image = 'ghcr.io/brennersta/happengo-api:latest'
param authAuthority = 'https://replace-with-your-tenant.auth0.com/'
param authAudience = 'https://replace-with-your-api-identifier'
param moderatorUserIds = []
param webOrigin = ''
