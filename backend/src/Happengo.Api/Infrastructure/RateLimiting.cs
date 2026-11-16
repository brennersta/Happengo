using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Mvc;

namespace Happengo.Api.Infrastructure;

public static class RateLimitPolicies
{
    public const string Writes = "writes";
    public const string Auth = "auth";
    public const string Uploads = "uploads";
}

internal static class RateLimiting
{
    public static void AddHappengoRateLimiter(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, cancellationToken) =>
            {
                var http = context.HttpContext;
                http.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                http.Response.ContentType = "application/problem+json";
                await http.Response.WriteAsJsonAsync(
                    new ProblemDetails
                    {
                        Status = StatusCodes.Status429TooManyRequests,
                        Title = "Too many requests",
                        Type = ProblemTypes.RateLimited,
                        Detail = "The request was rejected by a rate limit. Product caps for create, upload, and report are applied when those routes exist.",
                    },
                    cancellationToken);
            };

            options.AddPolicy(RateLimitPolicies.Writes, http => Partition(http, permitLimit: 30));
            options.AddPolicy(RateLimitPolicies.Auth, http => Partition(http, permitLimit: 20));
            options.AddPolicy(RateLimitPolicies.Uploads, http => Partition(http, permitLimit: 30));
        });
    }

    private static RateLimitPartition<string> Partition(HttpContext http, int permitLimit) =>
        RateLimitPartition.GetFixedWindowLimiter(
            PartitionKey(http),
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitLimit,
                Window = TimeSpan.FromMinutes(1),
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

        var ip = http.Connection.RemoteIpAddress?.ToString();
        return $"ip:{ip ?? "unknown"}";
    }
}
