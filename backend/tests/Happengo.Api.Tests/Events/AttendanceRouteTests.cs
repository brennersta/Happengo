using System.Net;
using Happengo.Api.Attendance;
using Happengo.Api.Events;
using Happengo.Api.Friends;
using Happengo.Api.Events.CreateEvent;
using Happengo.Api.Infrastructure;
using Happengo.Api.Tests.Support;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Happengo.Api.Tests.Events;

public sealed class AttendanceRouteTests(ApiFactory factory) : IntegrationTest
{
    [Fact]
    public async Task Approval_flow_lists_pending_requests_approves_then_allows_attendee_to_cancel()
    {
        await factory.ResetAsync();
        var created = await CreateAsync("owner", ApprovalMode.Approval);
        var join = await factory.CreateClient().SendAsync(ApiJson.Post(
            $"/v1/events/{created.Id}/attendance", new JoinEventRequest(null), "guest"));

        Assert.Equal(HttpStatusCode.OK, join.StatusCode);
        var requested = await join.Content.Read<AttendanceResponse>();
        Assert.Equal(AttendanceStatus.Requested, requested!.Status);
        Assert.Equal(1, requested.AttendingCount);

        var guestId = await UserIdAsync("guest");
        var owner = factory.CreateClient();
        var pendingResponse = await owner.SendAsync(ApiJson.Get(
            $"/v1/events/{created.Id}/attendance/requests", "owner"));
        var pending = await pendingResponse.Content.Read<PendingAttendanceResponse>();
        Assert.Equal(HttpStatusCode.OK, pendingResponse.StatusCode);
        Assert.Equal([guestId], pending!.UserIds);

        var approved = await owner.SendAsync(ApiJson.Post(
            $"/v1/events/{created.Id}/attendance/requests/{guestId}/approve", new { }, "owner"));
        var attending = await approved.Content.Read<AttendanceResponse>();
        Assert.Equal(HttpStatusCode.OK, approved.StatusCode);
        Assert.Equal(AttendanceStatus.Attending, attending!.Status);
        Assert.Equal(2, attending.AttendingCount);

        var cancelledResponse = await factory.CreateClient().SendAsync(ApiJson.Post(
            $"/v1/events/{created.Id}/attendance/cancel", new { }, "guest"));
        var cancelled = await cancelledResponse.Content.Read<AttendanceResponse>();
        Assert.Equal(HttpStatusCode.OK, cancelledResponse.StatusCode);
        Assert.Equal(AttendanceStatus.Cancelled, cancelled!.Status);
        Assert.Equal(1, cancelled.AttendingCount);
    }

    [Fact]
    public async Task Open_event_join_is_idempotent_and_anonymous_join_is_rejected()
    {
        await factory.ResetAsync();
        var created = await CreateAsync("open-owner", ApprovalMode.Open);
        var client = factory.CreateClient();

        var anonymous = await client.SendAsync(ApiJson.Post(
            $"/v1/events/{created.Id}/attendance", new JoinEventRequest(null)));
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);

        var first = await client.SendAsync(ApiJson.Post(
            $"/v1/events/{created.Id}/attendance", new JoinEventRequest(null), "guest"));
        var second = await client.SendAsync(ApiJson.Post(
            $"/v1/events/{created.Id}/attendance", new JoinEventRequest(null), "guest"));
        var body = await second.Content.Read<AttendanceResponse>();
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.Equal(AttendanceStatus.Attending, body!.Status);
        Assert.Equal(2, body.AttendingCount);
        Assert.Equal(2, await factory.WithDb(db => db.Attendances.CountAsync(row => row.EventId == created.Id)));
    }

    [Fact]
    public async Task Owner_can_reject_a_request_and_rejected_user_cannot_reopen_it()
    {
        await factory.ResetAsync();
        var created = await CreateAsync("reject-owner", ApprovalMode.Approval);
        var client = factory.CreateClient();
        var request = await client.SendAsync(ApiJson.Post(
            $"/v1/events/{created.Id}/attendance", new JoinEventRequest(null), "rejected-user"));
        Assert.Equal(HttpStatusCode.OK, request.StatusCode);

        var userId = await UserIdAsync("rejected-user");
        var rejected = await client.SendAsync(ApiJson.Post(
            $"/v1/events/{created.Id}/attendance/requests/{userId}/reject", new { }, "reject-owner"));
        var rejectedBody = await rejected.Content.Read<AttendanceResponse>();
        Assert.Equal(HttpStatusCode.OK, rejected.StatusCode);
        Assert.Equal(AttendanceStatus.Rejected, rejectedBody!.Status);
        Assert.Equal(1, rejectedBody.AttendingCount);

        var retry = await client.SendAsync(ApiJson.Post(
            $"/v1/events/{created.Id}/attendance", new JoinEventRequest(null), "rejected-user"));
        Assert.Equal(HttpStatusCode.Conflict, retry.StatusCode);
        var stored = await factory.WithDb(db => db.Attendances
            .Where(row => row.EventId == created.Id && row.UserId == userId)
            .Select(row => row.Status)
            .SingleAsync());
        Assert.Equal(AttendanceStatus.Rejected, stored);
    }

    [Fact]
    public async Task Caller_can_read_only_their_own_attendance_state()
    {
        await factory.ResetAsync();
        var created = await CreateAsync("state-owner", ApprovalMode.Approval);
        var client = factory.CreateClient();
        var guestRead = await client.SendAsync(ApiJson.Get(
            $"/v1/events/{created.Id}/attendance/me", "state-guest"));
        var notJoined = await guestRead.Content.Read<MyAttendanceResponse>();
        Assert.Equal(HttpStatusCode.OK, guestRead.StatusCode);
        Assert.Null(notJoined!.Status);

        await client.SendAsync(ApiJson.Post(
            $"/v1/events/{created.Id}/attendance", new JoinEventRequest(null), "state-guest"));
        var ownerRead = await client.SendAsync(ApiJson.Get(
            $"/v1/events/{created.Id}/attendance/me", "state-owner"));
        var ownerState = await ownerRead.Content.Read<MyAttendanceResponse>();
        Assert.Equal(HttpStatusCode.OK, ownerRead.StatusCode);
        Assert.Equal(AttendanceStatus.Attending, ownerState!.Status);

        var anonymous = await client.SendAsync(ApiJson.Get($"/v1/events/{created.Id}/attendance/me"));
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
    }

    [Fact]
    public async Task Unlisted_event_requires_share_token_and_friends_only_requires_invite()
    {
        await factory.ResetAsync();
        var unlisted = await CreateAsync("unlisted-owner", ApprovalMode.Open, EventVisibility.Unlisted);
        Assert.Null(unlisted.ShareToken);
        var token = ShareToken.New();
        await factory.WithDb(async db =>
        {
            var row = await db.Events.SingleAsync(item => item.Id == unlisted.Id);
            row.ShareTokenHash = ShareToken.Hash(token);
            await db.SaveChangesAsync();
        });
        var client = factory.CreateClient();

        var withoutToken = await client.SendAsync(ApiJson.Post(
            $"/v1/events/{unlisted.Id}/attendance", new JoinEventRequest(null), "guest"));
        var withToken = await client.SendAsync(ApiJson.Post(
            $"/v1/events/{unlisted.Id}/attendance", new JoinEventRequest(token), "guest"));
        Assert.Equal(HttpStatusCode.NotFound, withoutToken.StatusCode);
        Assert.Equal(HttpStatusCode.OK, withToken.StatusCode);

        var friendsOnly = await CreateAsync("friends-owner", ApprovalMode.Open, EventVisibility.FriendsOnly);
        var denied = await client.SendAsync(ApiJson.Post(
            $"/v1/events/{friendsOnly.Id}/attendance", new JoinEventRequest(null), "invitee"));
        Assert.Equal(HttpStatusCode.NotFound, denied.StatusCode);

        await BefriendAsync("friends-owner", "invitee");
        var allowed = await client.SendAsync(ApiJson.Post(
            $"/v1/events/{friendsOnly.Id}/attendance", new JoinEventRequest(null), "invitee"));
        Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
    }

    [Fact]
    public async Task Owner_cannot_manage_another_event_and_ended_event_rejects_join()
    {
        await factory.ResetAsync();
        var created = await CreateAsync("actual-owner", ApprovalMode.Approval);
        var guestId = Guid.CreateVersion7();
        var client = factory.CreateClient();
        var ownerRoute = await client.SendAsync(ApiJson.Get(
            $"/v1/events/{created.Id}/attendance/requests", "stranger"));
        Assert.Equal(HttpStatusCode.NotFound, ownerRoute.StatusCode);

        factory.Clock.Set(TestData.Now + Duration.FromHours(4));
        var ended = await client.SendAsync(ApiJson.Post(
            $"/v1/events/{created.Id}/attendance", new JoinEventRequest(null), "guest"));
        Assert.Equal(HttpStatusCode.Conflict, ended.StatusCode);
        var problem = await ended.Content.Read<Microsoft.AspNetCore.Mvc.ProblemDetails>();
        Assert.Equal(ProblemTypes.InvalidAttendance, problem!.Type);

        var decisionByStranger = await client.SendAsync(ApiJson.Post(
            $"/v1/events/{created.Id}/attendance/requests/{guestId}/approve", new { }, "stranger"));
        Assert.Equal(HttpStatusCode.NotFound, decisionByStranger.StatusCode);
    }

    private async Task<EventResponse> CreateAsync(
        string owner,
        ApprovalMode approvalMode,
        EventVisibility visibility = EventVisibility.Public)
    {
        var body = new CreateEventRequest
        {
            Title = "Attendance test",
            Description = "Test",
            StartAt = TestData.Now.ToDateTimeOffset().AddHours(1),
            EndAt = TestData.Now.ToDateTimeOffset().AddHours(3),
            TimeZoneId = "Europe/Tallinn",
            Address = "Tallinn",
            Longitude = TestData.InsideLng,
            Latitude = TestData.InsideLat,
            Visibility = visibility,
            ApprovalMode = approvalMode,
            Tags = [EventTag.Food],
        };
        var response = await factory.CreateClient().SendAsync(ApiJson.Post("/v1/events", body, owner));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.Read<EventResponse>())!;
    }

    private Task<Guid> UserIdAsync(string subject) =>
        factory.WithDb(db => db.Users.Where(user => user.Subject == subject).Select(user => user.Id).SingleAsync());

    private async Task BefriendAsync(string leftSubject, string rightSubject)
    {
        var left = await UserIdAsync(leftSubject);
        var right = await UserIdAsync(rightSubject);
        await factory.WithDb(async db =>
        {
            db.Friendships.Add(Friendship.Between(left, right, TestData.Now));
            await db.SaveChangesAsync();
        });
    }
}
