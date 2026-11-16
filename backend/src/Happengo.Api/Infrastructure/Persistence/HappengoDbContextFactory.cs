using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Configuration.UserSecrets;

namespace Happengo.Api.Infrastructure.Persistence;

public sealed class HappengoDbContextFactory : IDesignTimeDbContextFactory<HappengoDbContext>
{
    public HappengoDbContext CreateDbContext(string[] args)
    {
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile($"appsettings.{environment}.json", optional: true)
            .AddUserSecrets(typeof(HappengoDbContextFactory).Assembly, optional: true)
            .AddEnvironmentVariables()
            .Build();

        // Password is not in appsettings. Set ConnectionStrings__Happengo or user-secrets for a live database.
        var connectionString = configuration.GetConnectionString("Happengo")
            ?? "Host=localhost;Port=5432;Database=happengo;Username=happengo";

        var options = new DbContextOptionsBuilder<HappengoDbContext>()
            .UseHappengo(connectionString)
            .Options;

        return new HappengoDbContext(options);
    }
}
