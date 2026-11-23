using System.Net;
using Happengo.Api.Attendance;
using Happengo.Api.Events;
using Happengo.Api.Infrastructure;
using Happengo.Api.Events.CreateEvent;
using Happengo.Api.Tests.Support;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Happengo.Api.Tests.Events;

public sealed class GetMyEventsTests(ApiFactory factory) : IntegrationTest
{
    [Fact]
    public async Task Mine_returns_only_the_callers_owned_attending_and_requested_events()
    {
        await factory.ResetAsync();
        var client = factory.CreateClient();

        var anonymous = await client.SendAsync(ApiJson.Get("/v1/events/mine"));
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        var anonymousProblem = await anonymous.Content.Read<Microsoft.AspNetCore.Mvc.ProblemDetails>();
        Assert.Equal(ProblemTypes.Unauthorized, anonymousProblem!.Type);

        var owned = await CreateAsync("caller", "Owned dinner", ApprovalMode.Open);
        var attending = await CreateAsync("host", "Open gathering", ApprovalMode.Open);
        var requested = await CreateAsync("host-approval", "Approval gathering", ApprovalMode.Approval);
        var stranger = await CreateAsync("someone-else", "Not mine", ApprovalMode.Open);
        var rejected = await CreateAsync("reject-host", "Rejected gathering", ApprovalMode.Approval);

        var joined = await client.SendAsync(ApiJson.Post(
            $"/v1/events/{attending}/attendance", new JoinEventRequest(null), "caller"));
        Assert.Equal(HttpStatusCode.OK, joined.StatusCode);

        var asked = await client.SendAsync(ApiJson.Post(
            $"/v1/events/{requested}/attendance", new JoinEventRequest(null), "caller"));
        Assert.Equal(HttpStatusCode.OK, asked.StatusCode);

        var rejectedJoin = await client.SendAsync(ApiJson.Post(
            $"/v1/events/{rejected}/attendance", new JoinEventRequest(null), "caller"));
        Assert.Equal(HttpStatusCode.OK, rejectedJoin.StatusCode);
        var callerId = await factory.WithDb(db => db.Users
            .Where(user => user.Subject == "caller")
            .Select(user => user.Id)
            .SingleAsync());
        var decline = await client.SendAsync(ApiJson.Post(
            $"/v1/events/{rejected}/attendance/requests/{callerId}/reject", new { }, "reject-host"));
        Assert.Equal(HttpStatusCode.OK, decline.StatusCode);

        var response = await client.SendAsync(ApiJson.Get("/v1/events/mine", "caller"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var page = await response.Content.Read<EventMapResponse>();
        var ids = page!.Items.Select(item => item.Id).ToHashSet();
        Assert.Contains(owned, ids);
        Assert.Contains(attending, ids);
        Assert.Contains(requested, ids);
        Assert.DoesNotContain(stranger, ids);
        Assert.DoesNotContain(rejected, ids);
        Assert.All(page.Items, item => Assert.Null(item.ShareToken));

        var hostPage = await client.SendAsync(ApiJson.Get("/v1/events/mine", "host"));
        var hostIds = (await hostPage.Content.Read<EventMapResponse>())!.Items.Select(item => item.Id);
        Assert.Equal([attending], hostIds);
        Assert.DoesNotContain(owned, hostIds);
    }

    [Fact]
    public async Task Mine_keeps_owned_and_attending_events_after_they_end_and_drops_a_request()
    {
        await factory.ResetAsync();
        var client = factory.CreateClient();
        var owned = await CreateAsync("owner", "Past owned", ApprovalMode.Open);
        var requested = await CreateAsync("other", "Past request", ApprovalMode.Approval);
        var asked = await client.SendAsync(ApiJson.Post(
            $"/v1/events/{requested}/attendance", new JoinEventRequest(null), "owner"));
        Assert.Equal(HttpStatusCode.OK, asked.StatusCode);

        factory.Clock.Set(TestData.Now + Duration.FromHours(3));
        var response = await client.SendAsync(ApiJson.Get("/v1/events/mine", "owner"));
        var page = await response.Content.Read<EventMapResponse>();
        var ids = page!.Items.Select(item => item.Id).ToArray();
        Assert.Contains(owned, ids);
        Assert.DoesNotContain(requested, ids);
        var ownedRow = Assert.Single(page.Items, item => item.Id == owned);
        Assert.False(ownedRow.HappeningNow);

        var map = await client.SendAsync(ApiJson.Get($"/v1/events?bbox={TestData.Bbox}"));
        var mapPage = await map.Content.Read<EventMapResponse>();
        Assert.DoesNotContain(mapPage!.Items, item => item.Id == owned);
    }

    private async Task<Guid> CreateAsync(string owner, string title, ApprovalMode approvalMode)
    {
        var body = new CreateEventRequest
        {
            Title = title,
            Description = "Test",
            StartAt = TestData.Now.ToDateTimeOffset().AddHours(1),
            EndAt = TestData.Now.ToDateTimeOffset().AddHours(3),
            TimeZoneId = "Europe/Tallinn",
            Address = "Tallinn",
            Longitude = TestData.InsideLng,
            Latitude = TestData.InsideLat,
            Visibility = EventVisibility.Public,
            ApprovalMode = approvalMode,
            Tags = [EventTag.Music, EventTag.Food],
        };
        var response = await factory.CreateClient().SendAsync(ApiJson.Post("/v1/events", body, owner));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.Read<EventResponse>())!.Id;
    }
}
