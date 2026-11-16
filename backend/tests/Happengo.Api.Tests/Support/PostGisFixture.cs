using Testcontainers.PostgreSql;

namespace Happengo.Api.Tests.Support;

/// <summary>
/// One PostGIS database for a test run. Does not migrate.
/// Suites that only need SQL can take this fixture without starting the API.
/// </summary>
public sealed class PostGisFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgis/postgis:16-3.5")
        .WithDatabase("happengo")
        .WithUsername("happengo")
        .WithPassword("happengo")
        .Build();

    public string ConnectionString => _container.GetConnectionString();

    public Task InitializeAsync() => _container.StartAsync();

    public Task DisposeAsync() => _container.DisposeAsync().AsTask();
}
