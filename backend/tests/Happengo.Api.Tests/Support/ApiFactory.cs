using Happengo.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
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
            """TRUNCATE TABLE moderation_actions, reports, incident_votes, incidents, attendances, event_invites, event_invited_friend_tags, friend_tags, friendships, friend_invites, events, users RESTART IDENTITY CASCADE""");
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
        builder.UseSetting("RateLimiting:MapReads:PermitLimit", "100000");
        builder.UseSetting("RateLimiting:ShareReads:PermitLimit", "100000");
        builder.UseSetting("RateLimiting:Writes:PermitLimit", "100000");
        builder.UseSetting("RateLimiting:Auth:PermitLimit", "100000");
        builder.UseSetting("RateLimiting:Uploads:PermitLimit", "100000");
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IExceptionHandler>();
            services.AddSingleton<IExceptionHandler, TestExceptionHandler>();
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

/// <summary>Test-only handler that prints the exception and includes its details in failed responses.</summary>
internal sealed class TestExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        Console.Error.WriteLine($"Unhandled test-server exception: {exception}");
        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Title = "An unexpected error occurred.",
            Detail = exception.ToString(),
        };
        httpContext.Response.StatusCode = problem.Status.Value;
        httpContext.Response.ContentType = "application/problem+json";
        await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);
        return true;
    }
}

[CollectionDefinition(Name)]
public sealed class ApiCollection : ICollectionFixture<ApiFactory>
{
    public const string Name = "api";
}
