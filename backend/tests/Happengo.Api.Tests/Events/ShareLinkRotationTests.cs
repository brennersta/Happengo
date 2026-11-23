using System.Net;
using Happengo.Api.Attendance;
using Happengo.Api.Events;
using Happengo.Api.Events.RotateShareLink;
using Happengo.Api.Infrastructure;
using Happengo.Api.Tests.Support;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Happengo.Api.Tests.Events;

public sealed class ShareLinkRotationTests(ApiFactory factory) : IntegrationTest
{
    [Fact]
    public async Task Owner_rotation_replaces_hash_and_invalidates_old_link_without_grants_or_attendance_changes()
    {
        var (eventId, oldToken) = await SeedUnlistedEvent();
        var client = factory.CreateClient();
        var response = await PostAs(client, $"/v1/events/{eventId}/share-link", "owner");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var issued = (await response.Content.Read<RotateShareLinkResponse>())!;
        Assert.Equal(eventId, issued.EventId);
        Assert.NotEqual(oldToken, issued.ShareToken);
        Assert.True(ShareToken.TryCanonicalize(issued.ShareToken, out var canonical));

        var storedHash = await factory.WithDb(db => db.Events
            .Where(row => row.Id == eventId)
            .Select(row => row.ShareTokenHash)
            .SingleAsync());
        Assert.Equal(ShareToken.Hash(canonical), storedHash);
        Assert.NotEqual(ShareToken.Hash(oldToken), storedHash);

        var oldRead = await client.GetAsync($"/v1/events/shared/{Uri.EscapeDataString(oldToken)}");
        var newRead = await client.GetAsync($"/v1/events/shared/{Uri.EscapeDataString(issued.ShareToken)}");
        Assert.Equal(HttpStatusCode.NotFound, oldRead.StatusCode);
        Assert.Equal(HttpStatusCode.OK, newRead.StatusCode);

        var attendanceCount = await factory.WithDb(db => db.Attendances.CountAsync(row => row.EventId == eventId));
        var inviteCount = await factory.WithDb(db => db.EventInvites.CountAsync(row => row.EventId == eventId));
        Assert.Equal(1, attendanceCount);
        Assert.Equal(0, inviteCount);
        var detail = await client.SendAsync(ApiJson.Get($"/v1/events/{eventId}", "owner"));
        Assert.Equal(HttpStatusCode.OK, detail.StatusCode);
        Assert.Null((await detail.Content.Read<EventResponse>())!.ShareToken);
    }

    [Fact]
    public async Task Anonymous_and_non_owner_rotation_attempts_return_problem_details_401_and_404()
    {
        var (eventId, oldToken) = await SeedUnlistedEvent();
        var client = factory.CreateClient();

        using var anonymousRequest = new HttpRequestMessage(HttpMethod.Post, $"/v1/events/{eventId}/share-link");
        var anonymous = await client.SendAsync(anonymousRequest);
        await AssertProblem(anonymous, HttpStatusCode.Unauthorized, ProblemTypes.Unauthorized);

        var nonOwner = await PostAs(client, $"/v1/events/{eventId}/share-link", "not-owner");
        await AssertProblem(nonOwner, HttpStatusCode.NotFound, ProblemTypes.NotFound);

        var storedHash = await factory.WithDb(db => db.Events
            .Where(row => row.Id == eventId)
            .Select(row => row.ShareTokenHash)
            .SingleAsync());
        Assert.Equal(ShareToken.Hash(oldToken), storedHash);
    }

    private async Task<(Guid EventId, string OldToken)> SeedUnlistedEvent()
    {
        await factory.ResetAsync();
        return await factory.WithDb(async db =>
        {
            var owner = EventReadTests.NewUser("owner");
            db.Users.Add(owner);
            var item = EventReadTests.NewEvent(
                owner.Id,
                "private link event",
                EventVisibility.Unlisted,
                TestData.Now + Duration.FromHours(1),
                TestData.Now + Duration.FromHours(2));
            var oldToken = EventReadTests.IssuedShareTokens[item.Id];
            db.Events.Add(item);
            AttendanceAccess.AddOwnerAttending(db, item.Id, owner.Id, TestData.Now);
            await db.SaveChangesAsync();
            return (item.Id, oldToken);
        });
    }

    private static async Task<HttpResponseMessage> PostAs(HttpClient client, string uri, string subject)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, uri);
        request.Headers.Add(TestAuthHandler.HeaderName, subject);
        return await client.SendAsync(request);
    }

    private static async Task AssertProblem(HttpResponseMessage response, HttpStatusCode status, string type)
    {
        Assert.Equal(status, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.Read<ProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal((int)status, problem.Status);
        Assert.Equal(type, problem.Type);
    }
}
