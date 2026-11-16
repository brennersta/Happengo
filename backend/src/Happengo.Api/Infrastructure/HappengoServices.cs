using System.Text.Json.Serialization;
using Happengo.Api.Events.GetEvent;
using Happengo.Api.Events.GetEventsInBounds;
using Happengo.Api.Events.GetSharedEvent;
using Happengo.Api.Infrastructure.Auth;
using Happengo.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.OpenApi;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.IdentityModel.Tokens;
using NodaTime;

namespace Happengo.Api.Infrastructure;

public static class HappengoServices
{
    public static void AddHappengo(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Happengo")
            ?? throw new InvalidOperationException("Connection string 'Happengo' is required.");

        var authority = configuration["Authentication:Authority"];
        var audience = configuration["Authentication:Audience"];
        if (string.IsNullOrWhiteSpace(authority) || string.IsNullOrWhiteSpace(audience))
        {
            throw new InvalidOperationException(
                "Authentication:Authority and Authentication:Audience are required. They name the OIDC provider; none is hard-coded.");
        }

        services.AddDbContext<HappengoDbContext>(options => options.UseHappengo(connectionString));
        services.AddSingleton<IClock>(SystemClock.Instance);
        services.AddScoped<ViewerContext>();

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = authority;
                options.Audience = audience;
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidAudience = audience,
                    NameClaimType = "sub",
                };
            });

        services.AddAuthorization(options =>
        {
            options.FallbackPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build();
        });

        services.ConfigureHttpJsonOptions(options =>
        {
            options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
        });

        services.AddProblemDetails();
        services.AddExceptionHandler<ProblemExceptionHandler>();
        services.AddHealthChecks()
            .AddDbContextCheck<HappengoDbContext>("database");
        services.AddHappengoRateLimiter();
        services.AddOpenApi(options =>
        {
            options.AddDocumentTransformer((document, _, _) =>
            {
                document.Info.Title = "Happengo API";
                document.Info.Version = "v1";
                document.Info.Description =
                    "Read API for map-first local events. ProblemDetails type values are stable codes. "
                    + "EventTag is the fixed tag vocabulary. Bearer tokens are validated against the configured OIDC authority.";
                document.Servers?.Clear();
                if (document.Components?.Schemas is not null)
                {
                    foreach (var schema in document.Components.Schemas.Values)
                    {
                        if (schema is OpenApiSchema { Enum.Count: > 0, Type: null } openApiSchema)
                        {
                            openApiSchema.Type = JsonSchemaType.String;
                        }
                    }
                }

                return Task.CompletedTask;
            });
        });
    }

    public static WebApplication UseHappengo(this WebApplication app)
    {
        app.UseExceptionHandler();
        app.UseStatusCodePages(async status =>
        {
            var response = status.HttpContext.Response;
            if (response.HasStarted || response.StatusCode < 400)
            {
                return;
            }

            if (!string.IsNullOrEmpty(response.ContentType))
            {
                return;
            }

            response.ContentType = "application/problem+json";
            await response.WriteAsJsonAsync(new ProblemDetails
            {
                Status = response.StatusCode,
                Title = ReasonPhrases.GetReasonPhrase(response.StatusCode),
                Type = ProblemTypes.ForStatus(response.StatusCode),
            });
        });

        app.UseAuthentication();
        app.UseAuthorization();
        app.UseMiddleware<ViewerMiddleware>();
        app.UseRateLimiter();

        if (app.Environment.IsDevelopment())
        {
            app.MapOpenApi().AllowAnonymous();
        }

        app.MapHealthChecks("/health", new HealthCheckOptions
        {
            ResponseWriter = async (context, report) =>
            {
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsJsonAsync(new
                {
                    status = report.Status.ToString(),
                    checks = report.Entries.Select(entry => new
                    {
                        name = entry.Key,
                        status = entry.Value.Status.ToString(),
                    }),
                });
            },
        }).AllowAnonymous();

        var v1 = app.MapGroup("/v1");
        GetEventsInBounds.Map(v1);
        GetSharedEvent.Map(v1);
        GetEvent.Map(v1);

        // Product write, auth, and upload routes land on these groups later.
        // The limiter is partitioned per (issuer, sub) or client IP.
        v1.MapGroup("/auth").RequireRateLimiting(RateLimitPolicies.Auth);
        v1.MapGroup("/media").RequireRateLimiting(RateLimitPolicies.Uploads);
        v1.MapGroup(string.Empty).RequireRateLimiting(RateLimitPolicies.Writes);

        return app;
    }
}
