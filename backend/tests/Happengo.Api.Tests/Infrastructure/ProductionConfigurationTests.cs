using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Happengo.Api.Tests.Infrastructure;

public sealed class ProductionConfigurationTests
{
    [Fact]
    public void Production_fails_fast_when_the_connection_string_is_not_configured()
    {
        var exception = Start(new Dictionary<string, string?>
        {
            ["ConnectionStrings:Happengo"] = "",
            ["Authentication:Authority"] = "https://login.example.com/",
            ["Authentication:Audience"] = "happengo-api",
        });
        Assert.Contains("ConnectionStrings:Happengo", exception.ToString(), StringComparison.Ordinal);
        Assert.Contains("Production", exception.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public void Production_fails_fast_when_the_database_is_local()
    {
        var exception = Start(new Dictionary<string, string?>
        {
            ["ConnectionStrings:Happengo"] = "Host=localhost;Port=5432;Database=happengo;Username=happengo;Password=secret",
            ["Authentication:Authority"] = "https://login.example.com/",
            ["Authentication:Audience"] = "happengo-api",
        });
        Assert.Contains("local development database", exception.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public void Production_fails_fast_when_the_authority_is_the_development_placeholder()
    {
        var exception = Start(new Dictionary<string, string?>
        {
            ["ConnectionStrings:Happengo"] = "Host=db.internal;Port=5432;Database=happengo;Username=happengo;Password=secret",
            ["Authentication:Authority"] = "https://idp.example.com/",
            ["Authentication:Audience"] = "happengo-api",
        });
        Assert.Contains("Authentication:Authority", exception.ToString(), StringComparison.Ordinal);
        Assert.Contains("development placeholder", exception.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public void Production_starts_when_the_connection_string_and_authority_are_configured()
    {
        using var factory = Factory(new Dictionary<string, string?>
        {
            ["ConnectionStrings:Happengo"] = "Host=db.internal;Port=5432;Database=happengo;Username=happengo;Password=secret",
            ["Authentication:Authority"] = "https://login.example.com/real",
            ["Authentication:Audience"] = "happengo-api",
        });
        using var client = factory.CreateClient();
        Assert.NotNull(client.BaseAddress);
    }

    private static Exception Start(Dictionary<string, string?> settings)
    {
        var exception = Record.Exception(() =>
        {
            using var factory = Factory(settings);
            using var client = factory.CreateClient();
        });
        Assert.NotNull(exception);
        return exception!;
    }

    private static WebApplicationFactory<Program> Factory(Dictionary<string, string?> settings) =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(Microsoft.Extensions.Hosting.Environments.Production);
            foreach (var (key, value) in settings)
            {
                builder.UseSetting(key, value);
            }
        });
}
