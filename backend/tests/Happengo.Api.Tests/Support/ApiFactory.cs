using Happengo.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NodaTime;

namespace Happengo.Api.Tests.Support;

/// <summary>
/// HTTP host for the API. <see cref="Program"/> is public so this factory can boot it.
/// The host uses <see cref="Database"/> and replaces <see cref="IClock"/> with <see cref="Clock"/>.
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public PostGisFixture Database { get; } = new();

    public MutableClock Clock { get; } = new(TestData.Now);

    public async Task InitializeAsync()
    {
        await Database.InitializeAsync();
        await using var scope = Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<HappengoDbContext>();
        await db.Database.MigrateAsync();
        if (db.Database.HasPendingModelChanges())
        {
            throw new InvalidOperationException("The EF model has changes that are not in the migrations.");
        }
    }

    public async Task ResetAsync()
    {
        Clock.Set(TestData.Now);
        await using var scope = Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<HappengoDbContext>();
        await db.Database.ExecuteSqlRawAsync(
            """TRUNCATE TABLE attendances, event_invites, events, users RESTART IDENTITY CASCADE""");
    }

    public async Task<T> WithDb<T>(Func<HappengoDbContext, Task<T>> action)
    {
        await using var scope = Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<HappengoDbContext>();
        return await action(db);
    }

    public Task WithDb(Func<HappengoDbContext, Task> action) =>
        WithDb(async db =>
        {
            await action(db);
            return 0;
        });

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(Microsoft.Extensions.Hosting.Environments.Development);
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<DbContextOptions<HappengoDbContext>>();
            services.RemoveAll<HappengoDbContext>();
            services.RemoveAll<IDbContextOptionsConfiguration<HappengoDbContext>>();
            services.RemoveAll<IClock>();

            services.AddDbContext<HappengoDbContext>(options =>
                options.UseHappengo(Database.ConnectionString));
            services.AddSingleton<IClock>(Clock);

            services.AddAuthentication()
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });
            services.PostConfigure<AuthenticationOptions>(options =>
            {
                options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
            });
        });
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await base.DisposeAsync();
        await Database.DisposeAsync();
    }
}

[CollectionDefinition(Name)]
public sealed class ApiCollection : ICollectionFixture<ApiFactory>
{
    public const string Name = "api";
}
