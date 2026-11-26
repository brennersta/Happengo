using System.Text.Json.Serialization;
using Happengo.Api.Events.GetEvent;
using Happengo.Api.Events.GetEventsInBounds;
using Happengo.Api.Events.GetMyEvents;
using Happengo.Api.Events.RotateShareLink;
using Happengo.Api.Events.GetSharedEvent;
using Happengo.Api.Events.CreateEvent;
using Happengo.Api.Events.EditEvent;
using Happengo.Api.Events.CancelEvent;
using Happengo.Api.Attendance;
using Happengo.Api.Friends;
using Happengo.Api.Identity.Profile;
using Happengo.Api.Incidents;
using Happengo.Api.Moderation;
using Happengo.Api.Reports;
using Happengo.Api.Infrastructure.Auth;
using Happengo.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.OpenApi;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.IdentityModel.Tokens;
using NodaTime;
using Npgsql;

namespace Happengo.Api.Infrastructure;

public static class HappengoServices
{
    public static void AddHappengo(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        var forwardedHeaders = ForwardedHeaderSettings.Read(configuration);
        ProductionConfiguration.Ensure(environment, configuration, forwardedHeaders);

        var connectionString = configuration.GetConnectionString("Happengo");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("Connection string 'Happengo' is required.");
        }

        var authority = configuration["Authentication:Authority"];
        var audience = configuration["Authentication:Audience"];
        if (string.IsNullOrWhiteSpace(authority) || string.IsNullOrWhiteSpace(audience))
        {
            throw new InvalidOperationException(
                "Authentication:Authority and Authentication:Audience are required. They name the OIDC provider; none is hard-coded.");
        }

        if (configuration.GetValue<bool>("Database:UseManagedIdentity"))
        {
            services.AddSingleton(_ => AzurePostgres.CreateDataSource(connectionString));
            services.AddDbContext<HappengoDbContext>((provider, options) =>
                options.UseHappengo(provider.GetRequiredService<NpgsqlDataSource>()));
        }
        else
        {
            services.AddDbContext<HappengoDbContext>(options => options.UseHappengo(connectionString));
        }
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
                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = context =>
                    {
                        var subject = context.Principal?.FindFirst("sub")?.Value;
                        var issuer = context.Principal?.FindFirst("iss")?.Value;
                        if (string.IsNullOrWhiteSpace(subject) || string.IsNullOrWhiteSpace(issuer))
                        {
                            context.Fail("The access token must include iss and sub.");
                        }

                        return Task.CompletedTask;
                    },
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
            options.SerializerOptions.NumberHandling = JsonNumberHandling.Strict;
        });
        services.Configure<ForwardedHeadersOptions>(forwardedHeaders.Configure);

        services.AddProblemDetails();
        services.AddExceptionHandler<ProblemExceptionHandler>();
        services.AddHealthChecks()
            .AddDbContextCheck<HappengoDbContext>("database");
        services.AddHappengoRateLimiter(configuration);
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

                    if (document.Components.Schemas.TryGetValue("CreateEventRequest", out var createRequest)
                        && createRequest is OpenApiSchema createRequestSchema)
                    {
                        if (createRequestSchema.Properties is { } properties)
                        {
                            foreach (var name in createRequestSchema.Required ?? new HashSet<string>(StringComparer.Ordinal))
                            {
                                if (properties.TryGetValue(name, out var property)
                                    && property is OpenApiSchema propertySchema)
                                {
                                    propertySchema.Type &= ~JsonSchemaType.Null;
                                    if (propertySchema.OneOf is { } oneOf)
                                    {
                                        foreach (var nullableBranch in oneOf
                                            .Where(branch => branch is OpenApiSchema { Type: JsonSchemaType.Null })
                                            .ToArray())
                                        {
                                            oneOf.Remove(nullableBranch);
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (document.Components.Schemas.TryGetValue("EventResponse", out var eventSchema)
                        && eventSchema is OpenApiSchema responseSchema)
                    {
                        responseSchema.Required?.Remove("shareToken");
                    }
                }

                foreach (var path in document.Paths.Values)
                {
                    if (path.Operations is null)
                    {
                        continue;
                    }

                    foreach (var operation in path.Operations.Values)
                    {
                        foreach (var parameter in operation.Parameters ?? [])
                        {
                            if (parameter is OpenApiParameter { Name: "bbox" } openApiParameter)
                            {
                                openApiParameter.Required = true;
                            }
                        }
                    }
                }

                return Task.CompletedTask;
            });
        });
    }

    public static WebApplication UseHappengo(this WebApplication app)
    {
        app.UseForwardedHeaders();
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
        FriendRoutes.Map(v1);
        ProfileRoutes.Map(v1);
        GetEventsInBounds.Map(v1);
        GetMyEvents.Map(v1);
        RotateShareLink.Map(v1);
        EditEvent.Map(v1);
        CancelEvent.Map(v1);
        CreateEvent.Map(v1);
        AttendanceRoutes.Map(v1);
        GetSharedEvent.Map(v1);
        GetEvent.Map(v1);
        IncidentRoutes.Map(v1);
        ReportRoutes.Map(v1);
        ModerationRoutes.Map(v1);

        // Map reads and the share-link read carry their own per-IP policies.
        // Create and attendance attach the writes policy on the route. Auth and upload groups wait for those slices.
        v1.MapGroup("/auth").RequireRateLimiting(RateLimitPolicies.Auth);
        v1.MapGroup("/media").RequireRateLimiting(RateLimitPolicies.Uploads);
        v1.MapGroup(string.Empty).RequireRateLimiting(RateLimitPolicies.Writes);

        return app;
    }
}
