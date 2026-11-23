using System.Net.Http.Json;
using System.Net;
using Happengo.Api.Attendance;
using Happengo.Api.Events;
using Happengo.Api.Events.CreateEvent;
using Happengo.Api.Infrastructure;
using Happengo.Api.Tests.Support;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Happengo.Api.Tests.Events;

public sealed class CreateEventTests(ApiFactory factory) : IntegrationTest
{
    [Fact]
    public async Task Authenticated_owner_can_create_event_and_see_it_in_discovery()
    {
        await factory.ResetAsync();
        var response = await factory.CreateClient().SendAsync(ApiJson.Post(
            "/v1/events",
            RequestBody(),
            "event-creator"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.Read<EventResponse>();
        Assert.NotNull(created);
        Assert.Equal($"/v1/events/{created.Id}", response.Headers.Location?.ToString());
        Assert.True(created.IsOwner);
        Assert.Equal(1, created.AttendingCount);
        Assert.Equal("Dinner", created.Title);
        Assert.Equal([EventTag.Food], created.Tags);
        Assert.Null(created.ShareToken);
        var storedHash = await factory.WithDb(db => db.Events.AsNoTracking()
            .Where(row => row.Id == created.Id)
            .Select(row => row.ShareTokenHash)
            .SingleAsync());
        Assert.Equal(32, storedHash.Length);

        var publicMapResponse = await factory.CreateClient().SendAsync(
            ApiJson.Get($"/v1/events?bbox={TestData.Bbox}"));
        var map = await publicMapResponse.Content.Read<EventMapResponse>();
        var item = Assert.Single(map!.Items);
        Assert.Equal(created.Id, item.Id);
        Assert.Null(item.ShareToken);

        var ownerAttendance = await factory.WithDb(db => db.Attendances
            .AsNoTracking()
            .SingleAsync(row => row.EventId == created.Id));
        Assert.Equal(AttendanceStatus.Attending, ownerAttendance.Status);
    }

    [Fact]
    public async Task Anonymous_caller_cannot_create_event()
    {
        await factory.ResetAsync();
        var response = await factory.CreateClient().SendAsync(ApiJson.Post("/v1/events", RequestBody()));
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Missing_required_create_fields_are_rejected_by_request_binding()
    {
        await factory.ResetAsync();
        var response = await factory.CreateClient().SendAsync(ApiJson.Post("/v1/events", new { }, "event-creator"));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Tag_order_survives_create_and_read_and_the_first_tag_is_main()
    {
        await factory.ResetAsync();
        var body = RequestBody() with
        {
            Tags = [EventTag.Nightlife, EventTag.Food, EventTag.Nightlife, EventTag.Music],
        };
        var response = await factory.CreateClient().SendAsync(ApiJson.Post("/v1/events", body, "tag-owner"));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.Read<EventResponse>();
        Assert.Equal([EventTag.Nightlife, EventTag.Food, EventTag.Music], created!.Tags);
        Assert.Equal(EventTag.Nightlife, created.Tags[0]);

        var read = await factory.CreateClient().SendAsync(ApiJson.Get($"/v1/events/{created.Id}"));
        var loaded = await read.Content.Read<EventResponse>();
        Assert.Equal(created.Tags, loaded!.Tags);

        var stored = await factory.WithDb(db => db.Events.AsNoTracking()
            .Where(row => row.Id == created.Id)
            .Select(row => row.Tags)
            .SingleAsync());
        Assert.Equal(created.Tags, stored);
    }

    [Fact]
    public async Task Past_start_is_rejected_without_inserting_an_event()
    {
        await factory.ResetAsync();
        var body = RequestBody() with
        {
            StartAt = TestData.Now.ToDateTimeOffset().AddMinutes(-1),
        };
        var response = await factory.CreateClient().SendAsync(ApiJson.Post("/v1/events", body, "event-creator"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<Microsoft.AspNetCore.Mvc.ProblemDetails>(ApiJson.Options);
        Assert.Equal(ProblemTypes.InvalidEvent, problem!.Type);
        Assert.Equal(0, await factory.WithDb(db => db.Events.CountAsync()));
    }

    private static CreateEventRequest RequestBody() => new()
    {
        Title = " Dinner ",
        Description = "With family",
        StartAt = TestData.Now.ToDateTimeOffset().AddHours(1),
        EndAt = TestData.Now.ToDateTimeOffset().AddHours(3),
        TimeZoneId = "Europe/Tallinn",
        Address = "Tallinn",
        Longitude = TestData.InsideLng,
        Latitude = TestData.InsideLat,
        Visibility = EventVisibility.Public,
        ApprovalMode = ApprovalMode.Open,
        Tags = [EventTag.Food, EventTag.Food],
    };
}
