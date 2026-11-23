using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Happengo.Api.Infrastructure;
using Microsoft.Extensions.Configuration;

namespace Happengo.Api.Tests.Infrastructure;

public sealed class ProductionConfigurationTests
{
    [Fact]
    public void Forwarded_headers_are_disabled_by_default()
    {
        var settings = new ConfigurationBuilder().AddInMemoryCollection().Build();
        var forwarding = ForwardedHeaderSettings.Read(settings);
        Assert.False(forwarding.Enabled);
        Assert.Empty(forwarding.KnownProxies);
        Assert.Empty(forwarding.KnownNetworks);
    }

    [Theory]
    [InlineData("Production")]
    [InlineData("Staging")]
    public void Non_development_fails_fast_when_forwarding_is_enabled_without_trusted_proxies(string environment)
    {
        var exception = Start(environment, ValidSettings(new Dictionary<string, string?>
        {
            ["ForwardedHeaders:Enabled"] = "true",
        }));
        Assert.Contains("ForwardedHeaders:KnownProxies", exception.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public void Development_allows_forwarding_without_trusted_proxies_for_local_testing()
    {
        using var factory = Factory("Development", ValidSettings(new Dictionary<string, string?>
        {
            ["ForwardedHeaders:Enabled"] = "true",
        }));
        using var client = factory.CreateClient();
        Assert.NotNull(client.BaseAddress);
    }

    [Theory]
    [InlineData("Production")]
    [InlineData("Staging")]
    public void Non_development_fails_fast_when_the_connection_string_is_not_configured(string environment)
    {
        var exception = Start(environment, ValidSettings(new Dictionary<string, string?>
        {
            ["ConnectionStrings:Happengo"] = "",
        }));
        Assert.Contains("ConnectionStrings:Happengo", exception.ToString(), StringComparison.Ordinal);
        Assert.Contains(environment, exception.ToString(), StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("Production")]
    [InlineData("Staging")]
    public void Non_development_fails_fast_when_the_database_is_local(string environment)
    {
        var exception = Start(environment, ValidSettings(new Dictionary<string, string?>
        {
            ["ConnectionStrings:Happengo"] = "Host=localhost;Port=5432;Database=happengo;Username=happengo;Password=secret",
        }));
        Assert.Contains("local development database", exception.ToString(), StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("Production")]
    [InlineData("Staging")]
    public void Non_development_fails_fast_when_the_authority_is_the_development_placeholder(string environment)
    {
        var exception = Start(environment, ValidSettings(new Dictionary<string, string?>
        {
            ["Authentication:Authority"] = "https://idp.example.com/",
        }));
        Assert.Contains("Authentication:Authority", exception.ToString(), StringComparison.Ordinal);
        Assert.Contains("development placeholder", exception.ToString(), StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("Production")]
    [InlineData("Staging")]
    public void Non_development_starts_when_the_connection_string_and_authority_are_configured(string environment)
    {
        using var factory = Factory(environment, ValidSettings());
        using var client = factory.CreateClient();
        Assert.NotNull(client.BaseAddress);
    }

    private static Exception Start(string environment, Dictionary<string, string?> settings)
    {
        var exception = Record.Exception(() =>
        {
            using var factory = Factory(environment, settings);
            using var client = factory.CreateClient();
        });
        Assert.NotNull(exception);
        return exception!;
    }

    private static WebApplicationFactory<Program> Factory(string environment, Dictionary<string, string?> settings) =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(environment);
            foreach (var (key, value) in settings)
            {
                builder.UseSetting(key, value);
            }
        });

    private static Dictionary<string, string?> ValidSettings(Dictionary<string, string?>? extra = null)
    {
        var settings = new Dictionary<string, string?>
        {
            ["ConnectionStrings:Happengo"] = "Host=db.internal;Port=5432;Database=happengo;Username=happengo;Password=secret",
            ["Authentication:Authority"] = "https://login.example.com/real",
            ["Authentication:Audience"] = "happengo-api",
        };
        if (extra is not null)
        {
            foreach (var (key, value) in extra) settings[key] = value;
        }

        return settings;
    }
}
