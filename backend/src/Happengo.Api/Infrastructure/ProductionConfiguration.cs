using Npgsql;

namespace Happengo.Api.Infrastructure;

/// <summary>
/// Production has no localhost database and no placeholder issuer.
/// Development keeps those values; Production fails at startup instead of serving them.
/// </summary>
internal static class ProductionConfiguration
{
    public const string DevelopmentAuthority = "https://idp.example.com";

    public static void Ensure(
        IHostEnvironment environment,
        IConfiguration configuration,
        ForwardedHeaderSettings forwardedHeaders)
    {
        if (!environment.IsDevelopment() && forwardedHeaders.Enabled && !forwardedHeaders.HasTrustedProxy)
        {
            throw new InvalidOperationException(
                "ForwardedHeaders is enabled outside Development, but no ForwardedHeaders:KnownProxies or ForwardedHeaders:KnownNetworks are configured.");
        }

        if (!environment.IsProduction() && !environment.IsStaging())
        {
            return;
        }

        var connectionString = configuration.GetConnectionString("Happengo");
        if (string.IsNullOrWhiteSpace(connectionString) || IsDevelopmentDatabase(connectionString))
        {
            throw new InvalidOperationException(
                $"ConnectionStrings:Happengo must be configured outside Development ({environment.EnvironmentName}). The API does not fall back to the local development database.");
        }

        var authority = configuration["Authentication:Authority"];
        if (string.IsNullOrWhiteSpace(authority) || IsDevelopmentAuthority(authority))
        {
            throw new InvalidOperationException(
                $"Authentication:Authority must be configured outside Development ({environment.EnvironmentName}). The development placeholder is not an issuer.");
        }
    }

    private static bool IsDevelopmentDatabase(string connectionString)
    {
        NpgsqlConnectionStringBuilder builder;
        try
        {
            builder = new NpgsqlConnectionStringBuilder(connectionString);
        }
        catch (ArgumentException exception)
        {
            throw new InvalidOperationException(
                "ConnectionStrings:Happengo is not a valid Npgsql connection string.",
                exception);
        }

        var host = builder.Host;
        if (string.IsNullOrWhiteSpace(host)
            || host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
            || host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase)
            || host.Equals("::1", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return string.Equals(builder.Password, "happengo", StringComparison.Ordinal);
    }

    private static bool IsDevelopmentAuthority(string authority)
    {
        var trimmed = authority.Trim().TrimEnd('/');
        return trimmed.Equals(DevelopmentAuthority, StringComparison.OrdinalIgnoreCase);
    }
}
