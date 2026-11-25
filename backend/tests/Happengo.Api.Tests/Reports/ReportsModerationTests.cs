using System.Net;
using Happengo.Api.Events;
using Happengo.Api.Events.CreateEvent;
using Happengo.Api.Moderation;
using Happengo.Api.Reports;
using Happengo.Api.Tests.Support;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;

namespace Happengo.Api.Tests.Reports;

public sealed class ReportsModerationTests(ApiFactory factory) : IntegrationTest
{
    [Fact]
    public async Task Reports_are_unique_and_three_reporters_flag_the_target_without_hiding_it()
    {
        await factory.ResetAsync();
        var client = factory.CreateClient();
        var anonymous = await client.SendAsync(ApiJson.Post("/v1/reports", new { }, subject: null));
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        var created = await client.SendAsync(ApiJson.Post("/v1/events", EventRequest("Reported event"), "event-owner"));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var eventId = (await created.Content.Read<EventResponse>())!.Id;

        var first = await client.SendAsync(ApiJson.Post("/v1/reports", new CreateReportRequest(ReportTargetType.Event, eventId, ReportReason.SpamScam), "reporter-one"));
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        var duplicate = await client.SendAsync(ApiJson.Post("/v1/reports", new CreateReportRequest(ReportTargetType.Event, eventId, ReportReason.InappropriateContent), "reporter-one"));
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
        foreach (var subject in new[] { "reporter-two", "reporter-three" })
        {
            var response = await client.SendAsync(ApiJson.Post("/v1/reports", new CreateReportRequest(ReportTargetType.Event, eventId, ReportReason.FakeMisleading), subject));
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }

        var body = await first.Content.ReadAsStringAsync();
        Assert.Contains("\"priorityReview\":false", body, StringComparison.OrdinalIgnoreCase);
        var moderatorClient = factory.WithWebHostBuilder(builder => builder.UseSetting("Moderation:ModeratorUserIds:0", "moderator")).CreateClient();
        var flaggedQueue = await moderatorClient.SendAsync(ApiJson.Get("/v1/moderation/queue", "moderator"));
        Assert.Equal(HttpStatusCode.OK, flaggedQueue.StatusCode);
        var queueBody = await flaggedQueue.Content.ReadAsStringAsync();
        Assert.Contains("\"priorityReview\":true", queueBody, StringComparison.OrdinalIgnoreCase);
        var stillVisible = await client.SendAsync(ApiJson.Get($"/v1/events/{eventId}", "another-user"));
        Assert.Equal(HttpStatusCode.OK, stillVisible.StatusCode);
    }

    [Fact]
    public async Task Moderator_hides_event_for_everyone_except_owner_and_writes_audit_row()
    {
        await factory.ResetAsync();
        var client = factory.WithWebHostBuilder(builder => builder.UseSetting("Moderation:ModeratorUserIds:0", "moderator")).CreateClient();
        var created = await client.SendAsync(ApiJson.Post("/v1/events", EventRequest("Moderated event"), "event-owner"));
        var eventId = (await created.Content.Read<EventResponse>())!.Id;
        foreach (var subject in new[] { "reporter-one", "reporter-two", "reporter-three" })
        {
            var report = await client.SendAsync(ApiJson.Post("/v1/reports", new CreateReportRequest(ReportTargetType.Event, eventId, ReportReason.HarassmentUnsafe), subject));
            Assert.Equal(HttpStatusCode.Created, report.StatusCode);
        }

        var anonymous = await client.SendAsync(ApiJson.Get("/v1/moderation/queue"));
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        var nonModerator = await client.SendAsync(ApiJson.Get("/v1/moderation/queue", "not-a-moderator"));
        Assert.Equal(HttpStatusCode.NotFound, nonModerator.StatusCode);

        var queue = await client.SendAsync(ApiJson.Get("/v1/moderation/queue", "moderator"));
        Assert.Equal(HttpStatusCode.OK, queue.StatusCode);
        var queueBody = await queue.Content.ReadAsStringAsync();
        Assert.Contains("\"priorityReview\":true", queueBody, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("\"reportCount\":3", queueBody, StringComparison.OrdinalIgnoreCase);

        var hide = await client.SendAsync(ApiJson.Post($"/v1/moderation/events/{eventId}/hide", new ModerationActionRequest("Confirmed spam"), "moderator"));
        Assert.Equal(HttpStatusCode.OK, hide.StatusCode);
        var visibleToOwner = await client.SendAsync(ApiJson.Get($"/v1/events/{eventId}", "event-owner"));
        Assert.Equal(HttpStatusCode.OK, visibleToOwner.StatusCode);
        var hiddenForOthers = await client.SendAsync(ApiJson.Get($"/v1/events/{eventId}", "another-user"));
        Assert.Equal(HttpStatusCode.NotFound, hiddenForOthers.StatusCode);
        var auditCount = await factory.WithDb(db => db.ModerationActions.CountAsync());
        Assert.Equal(1, auditCount);
    }

    private static CreateEventRequest EventRequest(string title) => new()
    {
        Title = title,
        Description = "Event description",
        StartAt = TestData.Now.ToDateTimeOffset().AddHours(1),
        EndAt = TestData.Now.ToDateTimeOffset().AddHours(2),
        TimeZoneId = "Europe/Tallinn",
        Address = "Tallinn",
        Longitude = 24.75,
        Latitude = 59.43,
        Tags = [EventTag.Music],
        Visibility = EventVisibility.Public,
        ApprovalMode = ApprovalMode.Open,
        InvitedFriendTags = [],
    };
}
