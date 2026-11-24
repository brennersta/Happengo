using System.Net;
using Happengo.Api.Attendance;
using Happengo.Api.Events;
using Happengo.Api.Events.CreateEvent;
using Happengo.Api.Infrastructure;
using Happengo.Api.Tests.Support;

namespace Happengo.Api.Tests.Events;

public sealed class CancelEventTests(ApiFactory factory) : IntegrationTest
{
    [Fact]
    public async Task Owner_can_cancel_event_it_disappears_from_discovery_but_remains_readable_and_join_returns_409()
    {
        await factory.ResetAsync();
        var client = factory.CreateClient();
        var created = await CreateAsync(client, "owner");

        var response = await client.SendAsync(ApiJson.Post($"/v1/events/{created.Id}/cancel", new { }, "owner"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var cancelled = await response.Content.Read<EventResponse>();
        Assert.NotNull(cancelled?.CancelledAt);
        Assert.False(cancelled!.HappeningNow);

        var map = await client.SendAsync(ApiJson.Get($"/v1/events?bbox={TestData.Bbox}&tags=Music&happeningNow=false"));
        var mapPage = await map.Content.Read<EventMapResponse>();
        Assert.DoesNotContain(mapPage!.Items, item => item.Id == created.Id);

        var direct = await client.SendAsync(ApiJson.Get($"/v1/events/{created.Id}"));
        Assert.Equal(HttpStatusCode.OK, direct.StatusCode);
        Assert.NotNull((await direct.Content.Read<EventResponse>())!.CancelledAt);

        var mine = await client.SendAsync(ApiJson.Get("/v1/events/mine", "owner"));
        var minePage = await mine.Content.Read<EventMapResponse>();
        Assert.NotNull(Assert.Single(minePage!.Items, item => item.Id == created.Id).CancelledAt);

        var join = await client.SendAsync(ApiJson.Post(
            $"/v1/events/{created.Id}/attendance", new JoinEventRequest(null), "guest"));
        Assert.Equal(HttpStatusCode.Conflict, join.StatusCode);
        Assert.Contains("problem+json", join.Content.Headers.ContentType?.MediaType, StringComparison.Ordinal);
        Assert.Equal(ProblemTypes.EventConflict, (await join.Content.Read<Microsoft.AspNetCore.Mvc.ProblemDetails>())!.Type);
    }

    [Fact]
    public async Task Cancel_is_owner_only_with_ProblemDetails_for_anonymous_and_other_users()
    {
        await factory.ResetAsync();
        var client = factory.CreateClient();
        var created = await CreateAsync(client, "owner");

        var stranger = await client.SendAsync(ApiJson.Post($"/v1/events/{created.Id}/cancel", new { }, "stranger"));
        Assert.Equal(HttpStatusCode.NotFound, stranger.StatusCode);
        Assert.Equal(ProblemTypes.NotFound, (await stranger.Content.Read<Microsoft.AspNetCore.Mvc.ProblemDetails>())!.Type);

        var anonymous = await client.SendAsync(ApiJson.Post($"/v1/events/{created.Id}/cancel", new { }));
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        Assert.Equal(ProblemTypes.Unauthorized, (await anonymous.Content.Read<Microsoft.AspNetCore.Mvc.ProblemDetails>())!.Type);
    }

    private static async Task<EventResponse> CreateAsync(HttpClient client, string owner)
    {
        var request = new CreateEventRequest
        {
            Title = "Cancel test",
            Description = null,
            StartAt = TestData.Now.ToDateTimeOffset().AddHours(1),
            EndAt = TestData.Now.ToDateTimeOffset().AddHours(3),
            TimeZoneId = "Europe/Tallinn",
            Address = "Tallinn",
            Longitude = TestData.InsideLng,
            Latitude = TestData.InsideLat,
            Visibility = EventVisibility.Public,
            ApprovalMode = ApprovalMode.Open,
            Tags = [EventTag.Music],
        };
        var response = await client.SendAsync(ApiJson.Post("/v1/events", request, owner));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.Read<EventResponse>())!;
    }
}
