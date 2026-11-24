using System.Net;
using Happengo.Api.Attendance;
using Happengo.Api.Events;
using Happengo.Api.Events.CreateEvent;
using Happengo.Api.Friends;
using Happengo.Api.Identity.Profile;
using Happengo.Api.Tests.Support;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Happengo.Api.Tests.Events;

public sealed class FriendsGoingTests(ApiFactory factory) : IntegrationTest
{
    [Fact]
    public async Task Map_and_detail_show_only_sharing_friends_and_never_count_the_viewer_or_non_friends()
    {
        await factory.ResetAsync();
        var e = await CreateEventAsync("hosts-open-event", ApprovalMode.Open);
        var client = factory.CreateClient();
        var attendees = new[]
        {
            (Subject: "friend-ana", Name: "Ana"),
            (Subject: "friend-beatriz", Name: "Beatriz"),
            (Subject: "friend-carla", Name: "Carla"),
            (Subject: "friend-diana", Name: "Diana"),
            (Subject: "non-friend", Name: "Not A Friend"),
            (Subject: "friends-going-viewer", Name: "Viewer"),
        };

        foreach (var attendee in attendees)
        {
            var response = await JoinAsync(client, e.Id, attendee.Subject, attendee.Name);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal(AttendanceStatus.Attending, (await response.Content.Read<AttendanceResponse>())!.Status);
        }

        var viewerId = await UserIdAsync("friends-going-viewer");
        var friendIds = await Task.WhenAll(attendees.Take(4).Select(attendee => UserIdAsync(attendee.Subject)));
        await factory.WithDb(async db =>
        {
            foreach (var friendId in friendIds)
            {
                db.Friendships.Add(Friendship.Between(viewerId, friendId, TestData.Now));
            }

            await db.SaveChangesAsync();
        });

        var mapResponse = await client.SendAsync(ApiJson.Get($"/v1/events?bbox={TestData.Bbox}", "friends-going-viewer"));
        var map = (await mapResponse.Content.Read<EventMapResponse>())!;
        var mapEvent = Assert.Single(map.Items, item => item.Id == e.Id);
        Assert.Equal(4, mapEvent.FriendsGoing!.Count);
        Assert.Equal(["Ana", "Beatriz", "Carla"], mapEvent.FriendsGoing.Names);

        var detailResponse = await client.SendAsync(ApiJson.Get($"/v1/events/{e.Id}", "friends-going-viewer"));
        var detail = (await detailResponse.Content.Read<EventResponse>())!;
        Assert.Equal(4, detail.FriendsGoing!.Count);
        Assert.Equal(["Ana", "Beatriz", "Carla"], detail.FriendsGoing.Names);
        Assert.DoesNotContain("@example.com", await detailResponse.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);

        var strangerResponse = await client.SendAsync(ApiJson.Get($"/v1/events/{e.Id}", "unrelated-viewer"));
        var strangerDetail = (await strangerResponse.Content.Read<EventResponse>())!;
        Assert.Equal(0, strangerDetail.FriendsGoing!.Count);
        Assert.Empty(strangerDetail.FriendsGoing.Names);
    }

    [Fact]
    public async Task Anonymous_map_and_detail_responses_do_not_include_friends_attendance()
    {
        await factory.ResetAsync();
        var e = await CreateEventAsync("anonymous-visible-owner", ApprovalMode.Open);
        var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await JoinAsync(client, e.Id, "anonymous-friend", "Ana")).StatusCode);

        var mapResponse = await client.SendAsync(ApiJson.Get($"/v1/events?bbox={TestData.Bbox}"));
        var map = (await mapResponse.Content.Read<EventMapResponse>())!;
        Assert.Null(Assert.Single(map.Items, item => item.Id == e.Id).FriendsGoing);

        var detailResponse = await client.SendAsync(ApiJson.Get($"/v1/events/{e.Id}"));
        var detail = (await detailResponse.Content.Read<EventResponse>())!;
        Assert.Null(detail.FriendsGoing);
        Assert.DoesNotContain("Ana", await detailResponse.Content.ReadAsStringAsync(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Friends_who_opt_out_are_not_in_the_count_or_names()
    {
        await factory.ResetAsync();
        var e = await CreateEventAsync("opt-out-owner", ApprovalMode.Open);
        var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await JoinAsync(client, e.Id, "opted-out-friend", "Ana")).StatusCode);
        var viewerId = await UserIdAsync("opt-out-viewer");
        var friendId = await UserIdAsync("opted-out-friend");
        await LinkFriendsAsync(viewerId, friendId);

        var update = await client.SendAsync(ApiJson.Put(
            "/v1/me/attendance-sharing",
            new UpdateAttendanceSharingRequest(false),
            "opted-out-friend"));
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        var mapResponse = await client.SendAsync(ApiJson.Get($"/v1/events?bbox={TestData.Bbox}", "opt-out-viewer"));
        var map = (await mapResponse.Content.Read<EventMapResponse>())!;
        var friendsGoing = Assert.Single(map.Items, item => item.Id == e.Id).FriendsGoing!;
        Assert.Equal(0, friendsGoing.Count);
        Assert.Empty(friendsGoing.Names);
    }

    [Fact]
    public async Task Pending_friend_requests_are_not_counted_as_going()
    {
        await factory.ResetAsync();
        var e = await CreateEventAsync("pending-owner", ApprovalMode.Approval);
        var client = factory.CreateClient();
        var pending = await JoinAsync(client, e.Id, "pending-friend", "Ana");
        Assert.Equal(HttpStatusCode.OK, pending.StatusCode);
        Assert.Equal(AttendanceStatus.Requested, (await pending.Content.Read<AttendanceResponse>())!.Status);
        var viewerId = await UserIdAsync("pending-viewer");
        var friendId = await UserIdAsync("pending-friend");
        await LinkFriendsAsync(viewerId, friendId);

        var detailResponse = await client.SendAsync(ApiJson.Get($"/v1/events/{e.Id}", "pending-viewer"));
        var detail = (await detailResponse.Content.Read<EventResponse>())!;
        Assert.Equal(0, detail.FriendsGoing!.Count);
        Assert.Empty(detail.FriendsGoing.Names);
    }

    private async Task<EventResponse> CreateEventAsync(string owner, ApprovalMode approvalMode)
    {
        var request = new CreateEventRequest
        {
            Title = "Friends going test",
            Description = null,
            StartAt = TestData.Now.ToDateTimeOffset().AddHours(1),
            EndAt = TestData.Now.ToDateTimeOffset().AddHours(3),
            TimeZoneId = "Europe/Tallinn",
            Address = "Tallinn",
            Longitude = TestData.InsideLng,
            Latitude = TestData.InsideLat,
            Visibility = EventVisibility.Public,
            ApprovalMode = approvalMode,
            Tags = [EventTag.Music],
        };
        var response = await factory.CreateClient().SendAsync(ApiJson.Post("/v1/events", request, owner));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.Read<EventResponse>())!;
    }

    private static Task<HttpResponseMessage> JoinAsync(HttpClient client, Guid eventId, string subject, string displayName)
    {
        var request = ApiJson.Post(
            $"/v1/events/{eventId}/attendance",
            new JoinEventRequest(null),
            subject);
        request.Headers.Add(TestAuthHandler.DisplayNameHeaderName, displayName);
        return client.SendAsync(request);
    }

    private async Task<Guid> UserIdAsync(string subject)
    {
        var response = await factory.CreateClient().SendAsync(ApiJson.Get("/v1/me", subject));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await factory.WithDb(db => db.Users.Where(user => user.Subject == subject).Select(user => user.Id).SingleAsync());
    }

    private Task LinkFriendsAsync(Guid left, Guid right) => factory.WithDb(async db =>
    {
        db.Friendships.Add(Friendship.Between(left, right, TestData.Now));
        await db.SaveChangesAsync();
    });
}
