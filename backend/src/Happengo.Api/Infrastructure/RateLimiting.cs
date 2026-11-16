using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Mvc;

namespace Happengo.Api.Infrastructure;

public static class RateLimitPolicies
{
    public const string Writes = "writes";
    public const string Auth = "auth";
    public const string Uploads = "uploads";
    public const string MapReads = "map-reads";
    public const string ShareReads = "share-reads";
}

internal static class RateLimiting
{
    public static void AddHappengoRateLimiter(this IServiceCollection services, IConfiguration configuration)
    {
        var writes = ReadPolicy(configuration, "Writes", permitLimit: 30, windowSeconds: 60);
        var auth = ReadPolicy(configuration, "Auth", permitLimit: 20, windowSeconds: 60);
        var uploads = ReadPolicy(configuration, "Uploads", permitLimit: 30, windowSeconds: 60);
        var mapReads = ReadPolicy(configuration, "MapReads", permitLimit: 120, windowSeconds: 60);
        var shareReads = ReadPolicy(configuration, "ShareReads", permitLimit: 30, windowSeconds: 60);

        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, cancellationToken) =>
            {
                var http = context.HttpContext;
                http.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                await http.Response.WriteAsJsonAsync(
                    new ProblemDetails
                    {
                        Status = StatusCodes.Status429TooManyRequests,
                        Title = "Too many requests",
                        Type = ProblemTypes.RateLimited,
                        Detail = "The request was rejected by a rate limit.",
                    },
                    options: null,
                    contentType: "application/problem+json",
                    cancellationToken);
            };

            options.AddPolicy(RateLimitPolicies.Writes, http => Partition(http, RateLimitPolicies.Writes, writes));
            options.AddPolicy(RateLimitPolicies.Auth, http => Partition(http, RateLimitPolicies.Auth, auth));
            options.AddPolicy(RateLimitPolicies.Uploads, http => Partition(http, RateLimitPolicies.Uploads, uploads));
            options.AddPolicy(RateLimitPolicies.MapReads, http => Partition(http, RateLimitPolicies.MapReads, mapReads));
            options.AddPolicy(RateLimitPolicies.ShareReads, http => Partition(http, RateLimitPolicies.ShareReads, shareReads));
        });
    }

    internal static string KeyFor(string policy, HttpContext http) =>
        policy is RateLimitPolicies.MapReads or RateLimitPolicies.ShareReads
            ? IpKey(http)
            : PartitionKey(http);

    private static RateLimitPartition<string> Partition(HttpContext http, string policy, Limit limit) =>
        RateLimitPartition.GetFixedWindowLimiter(
            KeyFor(policy, http),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = limit.PermitLimit,
                Window = TimeSpan.FromSeconds(limit.WindowSeconds),
                QueueLimit = 0,
                AutoReplenishment = true,
            });

    internal static string PartitionKey(HttpContext http)
    {
        var issuer = http.User.FindFirst("iss")?.Value;
        var subject = http.User.FindFirst("sub")?.Value;
        if (!string.IsNullOrEmpty(issuer) && !string.IsNullOrEmpty(subject))
        {
            return $"user:{issuer}|{subject}";
        }

        return IpKey(http);
    }

    internal static string IpKey(HttpContext http)
    {
        var ip = http.Connection.RemoteIpAddress?.ToString();
        return $"ip:{ip ?? "unknown"}";
    }

    private static Limit ReadPolicy(IConfiguration configuration, string name, int permitLimit, int windowSeconds)
    {
        var section = configuration.GetSection($"RateLimiting:{name}");
        var permit = section.GetValue<int?>("PermitLimit") ?? permitLimit;
        var window = section.GetValue<int?>("WindowSeconds") ?? windowSeconds;
        if (permit < 1 || window < 1)
        {
            throw new InvalidOperationException(
                $"RateLimiting:{name} requires a positive PermitLimit and WindowSeconds.");
        }

        return new Limit(permit, window);
    }

    private readonly record struct Limit(int PermitLimit, int WindowSeconds);
}
