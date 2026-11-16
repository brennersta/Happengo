using Microsoft.EntityFrameworkCore;

namespace Happengo.Api.Infrastructure.Persistence;

internal static class HappengoDb
{
    public static TBuilder UseHappengo<TBuilder>(this TBuilder builder, string connectionString)
        where TBuilder : DbContextOptionsBuilder
    {
        builder.UseNpgsql(connectionString, npgsql =>
        {
            npgsql.UseNetTopologySuite();
            npgsql.UseNodaTime();
        });
        builder.UseSnakeCaseNamingConvention();
        return builder;
    }
}
