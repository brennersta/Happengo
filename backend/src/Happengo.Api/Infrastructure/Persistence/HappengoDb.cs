using Microsoft.EntityFrameworkCore;
using Npgsql;
using Npgsql.EntityFrameworkCore.PostgreSQL.Infrastructure;

namespace Happengo.Api.Infrastructure.Persistence;

internal static class HappengoDb
{
    public static TBuilder UseHappengo<TBuilder>(this TBuilder builder, string connectionString)
        where TBuilder : DbContextOptionsBuilder
    {
        builder.UseNpgsql(connectionString, Configure);
        builder.UseSnakeCaseNamingConvention();
        return builder;
    }

    public static void UseHappengo(this DbContextOptionsBuilder builder, NpgsqlDataSource dataSource)
    {
        builder.UseNpgsql(dataSource, Configure);
        builder.UseSnakeCaseNamingConvention();
    }

    private static void Configure(NpgsqlDbContextOptionsBuilder npgsql)
    {
        npgsql.UseNetTopologySuite();
        npgsql.UseNodaTime();
    }
}
