using System.Net;
using System.Net.Http.Headers;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace Happengo.Api.Tests.Infrastructure;

public sealed class JwtBearerClaimTests
{
    private static readonly SymmetricSecurityKey Key = new(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));

    [Theory]
    [InlineData(true, true, HttpStatusCode.OK, "user-1")]
    [InlineData(true, false, HttpStatusCode.Unauthorized, "user-1")]
    [InlineData(false, true, HttpStatusCode.Unauthorized, "user-1")]
    [InlineData(true, true, HttpStatusCode.Unauthorized, "")]
    public async Task Token_missing_sub_or_iss_is_rejected(bool includeIss, bool includeSub, HttpStatusCode expected, string? subject)
    {
        await using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(Microsoft.Extensions.Hosting.Environments.Development);
            builder.ConfigureTestServices(services =>
            {
                services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
                {
                    // Issuer validation would reject a missing iss before OnTokenValidated.
                    // Turn it off here so this test reaches the production OnTokenValidated check.
                    options.RequireHttpsMetadata = false;
                    options.TokenValidationParameters.ValidateIssuer = false;
                    options.TokenValidationParameters.ValidateAudience = true;
                    options.TokenValidationParameters.ValidateLifetime = true;
                    options.TokenValidationParameters.ValidateIssuerSigningKey = true;
                    options.TokenValidationParameters.ValidAudience = "happengo-api";
                    options.TokenValidationParameters.IssuerSigningKey = Key;
                    options.TokenValidationParameters.NameClaimType = "sub";
                    var config = new OpenIdConnectConfiguration
                    {
                        Issuer = "https://idp.example.com/",
                    };
                    config.SigningKeys.Add(Key);
                    options.Configuration = config;
                    options.ConfigurationManager = new StaticConfigurationManager<OpenIdConnectConfiguration>(config);
                });
                services.AddSingleton<IStartupFilter, JwtProbeStartup>();
            });
        });

        var client = factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Get, "/jwt-probe");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", Token(includeIss, includeSub, subject));
        var response = await client.SendAsync(request);
        Assert.Equal(expected, response.StatusCode);
    }

    private static string Token(bool includeIss, bool includeSub, string? subject)
    {
        var payload = new JsonObject
        {
            ["aud"] = "happengo-api",
            ["exp"] = DateTimeOffset.UtcNow.AddMinutes(5).ToUnixTimeSeconds(),
            ["nbf"] = DateTimeOffset.UtcNow.AddMinutes(-1).ToUnixTimeSeconds(),
        };
        if (includeIss)
        {
            payload["iss"] = "https://idp.example.com/";
        }

        if (includeSub)
        {
            payload["sub"] = subject;
        }

        return new Microsoft.IdentityModel.JsonWebTokens.JsonWebTokenHandler().CreateToken(
            payload.ToJsonString(),
            new SigningCredentials(Key, SecurityAlgorithms.HmacSha256));
    }

    private sealed class JwtProbeStartup : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
        {
            app.Use(async (context, nextPipe) =>
            {
                if (!context.Request.Path.Equals("/jwt-probe", StringComparison.Ordinal))
                {
                    await nextPipe();
                    return;
                }

                // 401 only when JwtBearer rejects the token, including OnTokenValidated.
                var result = await context.AuthenticateAsync(JwtBearerDefaults.AuthenticationScheme);
                context.Response.StatusCode = result.Succeeded
                    ? StatusCodes.Status200OK
                    : StatusCodes.Status401Unauthorized;
            });
            next(app);
        };
    }
}
