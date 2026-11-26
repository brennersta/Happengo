using Azure.Core;
using Azure.Identity;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Happengo.Api.Infrastructure.Persistence;

internal static class AzurePostgres
{
    public static NpgsqlDataSource CreateDataSource(string connectionString)
    {
        var credential = new ManagedIdentityCredential();
        var tokenRequest = new TokenRequestContext(["https://ossrdbms-aad.database.windows.net/.default"]);
        var builder = new NpgsqlDataSourceBuilder(connectionString);
        builder.UseNetTopologySuite();
        builder.UseNodaTime();
        builder.UsePeriodicPasswordProvider(
            async (_, cancellationToken) => (await credential.GetTokenAsync(tokenRequest, cancellationToken)).Token,
            TimeSpan.FromMinutes(5),
            TimeSpan.FromSeconds(10));
        return builder.Build();
    }

    public static async Task MigrateAsync(IServiceProvider services)
    {
        if (!services.GetRequiredService<IConfiguration>().GetValue<bool>("Database:UseManagedIdentity"))
        {
            throw new InvalidOperationException("Azure migrations require managed identity.");
        }

        await using var scope = services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<HappengoDbContext>().Database;
        // The initial EF migration already emits CREATE EXTENSION IF NOT EXISTS postgis
        // before creating spatial tables.
        await database.MigrateAsync();
        await database.ExecuteSqlRawAsync("""
            GRANT USAGE ON SCHEMA public TO "happengo-api";
            GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "happengo-api";
            GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "happengo-api";
            """);
    }
}
