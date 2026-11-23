using System.Net;
using System.Security.Claims;
using Happengo.Api.Events;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Happengo.Api.Infrastructure;
using Happengo.Api.Infrastructure.Persistence;
using Happengo.Api.Tests.Support;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Happengo.Api.Tests.Infrastructure;

public sealed class RateLimitPartitionTests
{
    [Fact]
    public void Map_and_share_policies_partition_by_ip_even_for_an_authenticated_caller()
    {
        var first = Context("203.0.113.8", authenticated: true);
        var second = Context("203.0.113.9", authenticated: true);

        Assert.Equal("ip:203.0.113.8", RateLimiting.KeyFor(RateLimitPolicies.MapReads, first));
        Assert.Equal("ip:203.0.113.9", RateLimiting.KeyFor(RateLimitPolicies.ShareReads, second));
        Assert.NotEqual(
            RateLimiting.KeyFor(RateLimitPolicies.MapReads, first),
            RateLimiting.KeyFor(RateLimitPolicies.MapReads, second));
        Assert.Equal("user:https://idp.example|ada", RateLimiting.KeyFor(RateLimitPolicies.Writes, first));
        Assert.Equal("user:https://idp.example|ada", RateLimiting.KeyFor(RateLimitPolicies.Auth, first));
        Assert.Equal("user:https://idp.example|ada", RateLimiting.KeyFor(RateLimitPolicies.Uploads, first));
    }

    [Fact]
    public void Anonymous_callers_partition_by_ip()
    {
        var http = Context("198.51.100.4", authenticated: false);
        Assert.Equal("ip:198.51.100.4", RateLimiting.KeyFor(RateLimitPolicies.MapReads, http));
        Assert.Equal("ip:198.51.100.4", RateLimiting.PartitionKey(http));
    }

    private static DefaultHttpContext Context(string ip, bool authenticated)
    {
        var http = new DefaultHttpContext();
        http.Connection.RemoteIpAddress = System.Net.IPAddress.Parse(ip);
        if (authenticated)
        {
            http.User = new ClaimsPrincipal(new ClaimsIdentity(
                [
                    new Claim("iss", "https://idp.example"),
                    new Claim("sub", "ada"),
                ],
                authenticationType: "Bearer"));
        }

        return http;
    }
}

public sealed class RateLimitRejectionTests(ApiFactory factory) : IntegrationTest
{
    [Fact]
    public async Task Trusted_forwarded_client_addresses_receive_separate_map_rate_limit_buckets()
    {
        await factory.ResetAsync();
        await using var host = ForwardedHeadersHost(
            remoteAddress: "10.0.0.10",
            knownProxy: "10.0.0.10",
            knownNetwork: "10.0.0.0/24");
        using var firstClient = host.CreateClient();
        using var secondClient = host.CreateClient();

        var first = await GetMapWithForwardedFor(firstClient, "192.0.2.11");
        var second = await GetMapWithForwardedFor(secondClient, "192.0.2.12");
        var firstAgain = await GetMapWithForwardedFor(firstClient, "192.0.2.11");

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        await AssertLimited(firstAgain);
    }

    [Fact]
    public async Task Untrusted_forwarded_for_does_not_change_the_rate_limit_client_address()
    {
        await factory.ResetAsync();
        await using var host = ForwardedHeadersHost(remoteAddress: "10.0.0.11", knownProxy: "10.0.0.10");
        using var client = host.CreateClient();

        var first = await GetMapWithForwardedFor(client, "192.0.2.21");
        var second = await GetMapWithForwardedFor(client, "192.0.2.22");

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        await AssertLimited(second);
    }

    [Fact]
    public async Task Map_and_share_reads_return_problem_details_when_the_per_ip_limit_is_exceeded()
    {
        await factory.ResetAsync();
        await using var host = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(Microsoft.Extensions.Hosting.Environments.Development);
            builder.UseSetting("RateLimiting:MapReads:PermitLimit", "2");
            builder.UseSetting("RateLimiting:MapReads:WindowSeconds", "60");
            builder.UseSetting("RateLimiting:ShareReads:PermitLimit", "2");
            builder.UseSetting("RateLimiting:ShareReads:WindowSeconds", "60");
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<DbContextOptions<HappengoDbContext>>();
                services.RemoveAll<HappengoDbContext>();
                services.RemoveAll<IDbContextOptionsConfiguration<HappengoDbContext>>();
                services.AddDbContext<HappengoDbContext>(options =>
                    options.UseHappengo(factory.Database.ConnectionString));
            });
        });

        var client = host.CreateClient();
        var map1 = await client.GetAsync($"/v1/events?bbox={TestData.Bbox}");
        var map2 = await client.GetAsync($"/v1/events?bbox={TestData.Bbox}");
        var map3 = await client.GetAsync($"/v1/events?bbox={TestData.Bbox}");
        Assert.Equal(HttpStatusCode.OK, map1.StatusCode);
        Assert.Equal(HttpStatusCode.OK, map2.StatusCode);
        await AssertLimited(map3);

        var token = Uri.EscapeDataString(ShareToken.New());
        var share1 = await client.GetAsync($"/v1/events/shared/{token}");
        var share2 = await client.GetAsync($"/v1/events/shared/{token}");
        var share3 = await client.GetAsync($"/v1/events/shared/{token}");
        Assert.NotEqual(HttpStatusCode.TooManyRequests, share1.StatusCode);
        Assert.NotEqual(HttpStatusCode.TooManyRequests, share2.StatusCode);
        await AssertLimited(share3);

        for (var i = 0; i < 5; i++)
        {
            var byId = await client.GetAsync($"/v1/events/{Guid.CreateVersion7()}");
            Assert.NotEqual(HttpStatusCode.TooManyRequests, byId.StatusCode);
        }
    }

    private static async Task AssertLimited(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.Read<ProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal(StatusCodes.Status429TooManyRequests, problem.Status);
        Assert.Equal(ProblemTypes.RateLimited, problem.Type);
        Assert.Equal("Too many requests", problem.Title);
    }

    private WebApplicationFactory<Program> ForwardedHeadersHost(
        string remoteAddress,
        string knownProxy,
        string? knownNetwork = null) =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(Microsoft.Extensions.Hosting.Environments.Development);
            builder.UseSetting("ForwardedHeaders:Enabled", "true");
            builder.UseSetting("ForwardedHeaders:KnownProxies:0", knownProxy);
            if (knownNetwork is not null)
            {
                builder.UseSetting("ForwardedHeaders:KnownNetworks:0", knownNetwork);
            }

            builder.UseSetting("RateLimiting:MapReads:PermitLimit", "1");
            builder.UseSetting("RateLimiting:MapReads:WindowSeconds", "60");
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<DbContextOptions<HappengoDbContext>>();
                services.RemoveAll<HappengoDbContext>();
                services.RemoveAll<IDbContextOptionsConfiguration<HappengoDbContext>>();
                services.AddDbContext<HappengoDbContext>(options =>
                    options.UseHappengo(factory.Database.ConnectionString));
                services.AddSingleton<IStartupFilter>(new RemoteAddressStartupFilter(IPAddress.Parse(remoteAddress)));
            });
        });

    private static async Task<HttpResponseMessage> GetMapWithForwardedFor(HttpClient client, string clientAddress)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"/v1/events?bbox={TestData.Bbox}");
        request.Headers.TryAddWithoutValidation("X-Forwarded-For", clientAddress);
        return await client.SendAsync(request);
    }

    private sealed class RemoteAddressStartupFilter(IPAddress remoteAddress) : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
        {
            app.Use(async (context, continuation) =>
            {
                context.Connection.RemoteIpAddress = remoteAddress;
                await continuation();
            });
            next(app);
        };
    }
}
