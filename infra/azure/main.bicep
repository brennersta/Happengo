param location string = 'northeurope'
param image string
param authAuthority string
param authAudience string
param moderatorUserIds array = []
param webOrigin string = ''
param bootstrap bool = false

var appName = 'happengo-api'
var jobName = 'happengo-migrate'
var dbName = 'happengo'

resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'happengo-logs'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'happengo-env'
  location: location
  properties: {
    workloadProfiles: [
      { name: 'Consumption', workloadProfileType: 'Consumption' }
    ]
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
  }
}

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: 'happengo-${uniqueString(resourceGroup().id)}'
  location: location
  sku: { name: 'Standard_B1ms', tier: 'Burstable' }
  properties: {
    version: '16'
    storage: { storageSizeGB: 32 }
    backup: { backupRetentionDays: 7, geoRedundantBackup: 'Disabled' }
    highAvailability: { mode: 'Disabled' }
    network: { publicNetworkAccess: 'Enabled' }
    authConfig: {
      activeDirectoryAuth: 'Enabled'
      passwordAuth: 'Disabled'
      tenantId: tenant().tenantId
    }
  }
}

resource azureFirewall 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: postgres
  name: 'AllowAzureServices'
  properties: { startIpAddress: '0.0.0.0', endIpAddress: '0.0.0.0' }
}

resource extensions 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2024-08-01' = {
  parent: postgres
  name: 'azure.extensions'
  properties: { source: 'user-override', value: 'POSTGIS,PGCRYPTO' }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: postgres
  name: dbName
  properties: { charset: 'UTF8', collation: 'en_US.utf8' }
}

var commonEnv = [
  { name: 'Database__UseManagedIdentity', value: 'true' }
  { name: 'Authentication__Authority', value: authAuthority }
  { name: 'Authentication__Audience', value: authAudience }
]
var moderatorEnv = [for (id, i) in moderatorUserIds: {
  name: 'Moderation__ModeratorUserIds__${i}'
  value: string(id)
}]

resource app 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    managedEnvironmentId: environment.id
    workloadProfileName: 'Consumption'
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: !bootstrap
        allowInsecure: false
        targetPort: 8080
        transport: 'auto'
        corsPolicy: empty(webOrigin) ? null : {
          allowedOrigins: [webOrigin]
          allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
          allowedHeaders: ['Authorization', 'Content-Type']
        }
      }
    }
    template: {
      containers: [
        {
          name: 'api'
          image: image
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: concat(commonEnv, [
            { name: 'ConnectionStrings__Happengo', value: 'Host=${postgres.properties.fullyQualifiedDomainName};Database=${dbName};Username=${appName};SSL Mode=VerifyFull' }
          ], moderatorEnv)
          probes: [
            bootstrap ? {
              type: 'Readiness'
              tcpSocket: { port: 8080 }
              periodSeconds: 10
            } : {
              type: 'Readiness'
              httpGet: { path: '/health', port: 8080 }
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: { minReplicas: 1, maxReplicas: 2 }
    }
  }
}

resource migrationJob 'Microsoft.App/jobs@2024-03-01' = {
  name: jobName
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    environmentId: environment.id
    workloadProfileName: 'Consumption'
    configuration: {
      triggerType: 'Manual'
      replicaTimeout: 600
      replicaRetryLimit: 3
      manualTriggerConfig: { parallelism: 1, replicaCompletionCount: 1 }
    }
    template: {
      containers: [
        {
          name: 'migrate'
          image: image
          args: ['--migrate-azure']
          resources: { cpu: json('0.5'), memory: '1Gi' }
          env: concat(commonEnv, [
            { name: 'ConnectionStrings__Happengo', value: 'Host=${postgres.properties.fullyQualifiedDomainName};Database=${dbName};Username=${jobName};SSL Mode=VerifyFull' }
          ])
        }
      ]
    }
  }
}

module apiAdmin './postgres-admin.bicep' = {
  name: 'happengo-api-db-admin'
  params: {
    serverName: postgres.name
    principalId: app.identity.principalId
    principalName: appName
  }
}

module jobAdmin './postgres-admin.bicep' = {
  name: 'happengo-migrate-db-admin'
  params: {
    serverName: postgres.name
    principalId: migrationJob.identity.principalId
    principalName: jobName
  }
  dependsOn: [apiAdmin]
}

output apiFqdn string = app.properties.configuration.ingress.fqdn
output postgresHost string = postgres.properties.fullyQualifiedDomainName
