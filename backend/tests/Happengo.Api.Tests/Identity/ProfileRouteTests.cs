using System.Net;
using Happengo.Api.Identity.Profile;
using Happengo.Api.Infrastructure;
using Happengo.Api.Tests.Support;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Happengo.Api.Tests.Identity;

public sealed class ProfileRouteTests(ApiFactory factory) : IntegrationTest
{
    [Fact]
    public async Task Anonymous_profile_reads_and_updates_return_401_problem_details()
    {
        await factory.ResetAsync();
        var client = factory.CreateClient();

        var get = await client.SendAsync(ApiJson.Get("/v1/me"));
        var put = await client.SendAsync(ApiJson.Put("/v1/me/display-name", new UpdateDisplayNameRequest("Ada")));

        await AssertUnauthorizedProblem(get);
        await AssertUnauthorizedProblem(put);
    }

    [Fact]
    public async Task User_can_set_a_trimmed_display_name_and_claim_sync_does_not_overwrite_it()
    {
        await factory.ResetAsync();
        var client = factory.CreateClient();

        var initial = await client.SendAsync(ApiJson.Get("/v1/me", "ada"));
        Assert.Equal(HttpStatusCode.OK, initial.StatusCode);
        var initialProfile = (await initial.Content.Read<ProfileResponse>())!;
        Assert.NotEqual(Guid.Empty, initialProfile.Id);
        Assert.Equal("ada", initialProfile.DisplayName);

        var update = await client.SendAsync(ApiJson.Put(
            "/v1/me/display-name",
            new UpdateDisplayNameRequest("  Ada Lovelace  "),
            "ada"));
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        var updatedProfile = (await update.Content.Read<ProfileResponse>())!;
        Assert.Equal(initialProfile.Id, updatedProfile.Id);
        Assert.Equal("Ada Lovelace", updatedProfile.DisplayName);

        var nextSignIn = ApiJson.Get("/v1/me", "ada");
        nextSignIn.Headers.Add(TestAuthHandler.DisplayNameHeaderName, "New IdP Claim");
        var afterSignIn = await client.SendAsync(nextSignIn);
        Assert.Equal(HttpStatusCode.OK, afterSignIn.StatusCode);
        var persistedProfile = (await afterSignIn.Content.Read<ProfileResponse>())!;
        Assert.Equal(initialProfile.Id, persistedProfile.Id);
        Assert.Equal("Ada Lovelace", persistedProfile.DisplayName);

        var storedName = await factory.WithDb(db => db.Users
            .Where(user => user.Id == initialProfile.Id)
            .Select(user => user.DisplayName)
            .SingleAsync());
        Assert.Equal("Ada Lovelace", storedName);
    }

    [Fact]
    public async Task Display_name_must_have_one_to_forty_characters_after_trimming()
    {
        await factory.ResetAsync();
        var client = factory.CreateClient();
        _ = await client.SendAsync(ApiJson.Get("/v1/me", "ada"));

        var blank = await client.SendAsync(ApiJson.Put(
            "/v1/me/display-name",
            new UpdateDisplayNameRequest("   "),
            "ada"));
        var tooLong = await client.SendAsync(ApiJson.Put(
            "/v1/me/display-name",
            new UpdateDisplayNameRequest(new string('a', 41)),
            "ada"));
        var forty = await client.SendAsync(ApiJson.Put(
            "/v1/me/display-name",
            new UpdateDisplayNameRequest(new string('b', 40)),
            "ada"));

        await AssertProblem(blank, HttpStatusCode.BadRequest, ProblemTypes.InvalidProfile);
        await AssertProblem(tooLong, HttpStatusCode.BadRequest, ProblemTypes.InvalidProfile);
        Assert.Equal(HttpStatusCode.OK, forty.StatusCode);
        Assert.Equal(new string('b', 40), (await forty.Content.Read<ProfileResponse>())!.DisplayName);
    }

    private static async Task AssertUnauthorizedProblem(HttpResponseMessage response) =>
        await AssertProblem(response, HttpStatusCode.Unauthorized, ProblemTypes.Unauthorized);

    private static async Task AssertProblem(HttpResponseMessage response, HttpStatusCode status, string type)
    {
        Assert.Equal(status, response.StatusCode);
        Assert.Contains("problem+json", response.Content.Headers.ContentType?.MediaType, StringComparison.Ordinal);
        Assert.Equal(type, (await response.Content.Read<ProblemDetails>())!.Type);
    }
}
