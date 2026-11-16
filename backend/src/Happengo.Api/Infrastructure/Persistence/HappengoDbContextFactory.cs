using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Happengo.Api.Infrastructure.Persistence;

public sealed class HappengoDbContextFactory : IDesignTimeDbContextFactory<HappengoDbContext>
{
    public HappengoDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__Happengo")
            ?? "Host=localhost;Port=5432;Database=happengo;Username=happengo;Password=happengo";

        var options = new DbContextOptionsBuilder<HappengoDbContext>()
            .UseHappengo(connectionString)
            .Options;

        return new HappengoDbContext(options);
    }
}
