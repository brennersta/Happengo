using System.Net;
using System.Security.Claims;
using Happengo.Api.Events;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Happengo.Api.Infrastructure;
using Happengo.Api.Infrastructure.Persistence;
using Happengo.Api.Tests.Support;
using Microsoft.AspNetCore.Hosting;
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
}
