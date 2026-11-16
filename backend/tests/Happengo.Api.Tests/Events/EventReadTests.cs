using System.Net;
using System.Net.Http.Json;
using Happengo.Api.Attendance;
using AttendanceRow = Happengo.Api.Attendance.Attendance;
using Happengo.Api.Events;
using Happengo.Api.Infrastructure;
using Happengo.Api.Infrastructure.Auth;
using Happengo.Api.Infrastructure.Persistence;
using Happengo.Api.Tests.Support;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Happengo.Api.Tests.Events;

public sealed class EventReadTests(ApiFactory factory) : IntegrationTest
{
    [Fact]
    public async Task Health_includes_a_database_check()
    {
        var response = await factory.CreateClient().GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Healthy", body, StringComparison.Ordinal);
        Assert.Contains("database", body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Bbox_query_uses_envelope_overlap_and_keeps_boundary_points()
    {
        await factory.ResetAsync();
        var inside = await SeedAsync("inside", TestData.InsideLng, TestData.InsideLat);
        var edge = await SeedAsync("edge", 24.7, TestData.InsideLat);
        var outside = await SeedAsync("outside", 25.2, TestData.InsideLat);

        var page = await GetMapAsync(null);
        var ids = page.Items.Select(item => item.Id).ToHashSet();
        Assert.Contains(inside, ids);
        Assert.Contains(edge, ids);
        Assert.DoesNotContain(outside, ids);
        Assert.Equal(500, page.Limit);
        Assert.False(page.Truncated);
        Assert.All(page.Items, item => Assert.Null(item.ShareToken));

        var sql = await factory.WithDb(db =>
        {
            var now = TestData.Now;
            var box = new BoundingBox(24.7, 59.4, 24.9, 59.5);
            var query = db.Events
                .InBoundingBox(box)
                .VisibleTo(db, Viewer.Anonymous, now, EventReadScope.Map)
                .OrderForDiscovery(now)
                .Take(EventQueries.MapResultLimit + 1);
            return Task.FromResult(query.ToQueryString());
        });

        Assert.Contains("ST_MakeEnvelope", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("&&", sql, StringComparison.Ordinal);
        Assert.Contains("end_at", sql, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("1,2,3")]
    [InlineData("24.7,95,24.9,59.5")]
    [InlineData("24.9,59.4,24.7,59.5")]
    [InlineData("nope")]
    public async Task Bad_bbox_is_a_problem(string? bbox)
    {
        await factory.ResetAsync();
        var url = bbox is null ? "/v1/events" : $"/v1/events?bbox={Uri.EscapeDataString(bbox)}";
        var response = await factory.CreateClient().SendAsync(ApiJson.Get(url));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("problem+json", response.Content.Headers.ContentType?.MediaType, StringComparison.Ordinal);
        var problem = await response.Content.Read<ProblemDetails>();
        Assert.Equal(ProblemTypes.InvalidBbox, problem!.Type);
    }

    [Fact]
    public async Task Tag_filter_matches_any_named_tag_and_rejects_unknown_tags()
    {
        await factory.ResetAsync();
        var music = await SeedAsync("music", tags: [EventTag.Music, EventTag.Food]);
        var sports = await SeedAsync("sports", tags: [EventTag.Sports]);

        var filtered = await GetMapAsync(null, "Music");
        Assert.Equal([music], filtered.Items.Select(item => item.Id));
        Assert.Equal([EventTag.Music, EventTag.Food], filtered.Items[0].Tags);

        var either = await GetMapAsync(null, "Music", "Sports");
        Assert.Equal(2, either.Items.Count);
        Assert.Contains(either.Items, item => item.Id == sports);

        var bad = await factory.CreateClient().SendAsync(ApiJson.Get($"/v1/events?bbox={TestData.Bbox}&tags=Party"));
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
        var problem = await bad.Content.Read<ProblemDetails>();
        Assert.Equal(ProblemTypes.InvalidTags, problem!.Type);
    }

    [Fact]
    public async Task Happening_now_is_computed_from_the_clock_and_sorts_first()
    {
        await factory.ResetAsync();
        var now = TestData.Now;
        var later = await SeedAsync("later", start: now + Duration.FromHours(3), end: now + Duration.FromHours(4));
        var soon = await SeedAsync("soon", start: now + Duration.FromMinutes(30), end: now + Duration.FromHours(2));
        var live = await SeedAsync("live", start: now - Duration.FromMinutes(10), end: now + Duration.FromHours(1));
        var ended = await SeedAsync("ended", start: now - Duration.FromHours(2), end: now);

        var page = await GetMapAsync(null);
        Assert.Equal([live, soon, later], page.Items.Select(item => item.Id));
        Assert.True(page.Items[0].HappeningNow);
        Assert.False(page.Items[1].HappeningNow);
        Assert.DoesNotContain(page.Items, item => item.Id == ended);

        factory.Clock.Set(now + Duration.FromMinutes(30));
        var moved = await GetMapAsync(null);
        var soonRow = Assert.Single(moved.Items, item => item.Id == soon);
        Assert.True(soonRow.HappeningNow);

        factory.Clock.Set(now + Duration.FromHours(1));
        var afterLive = await GetMapAsync(null);
        Assert.DoesNotContain(afterLive.Items, item => item.Id == live);
    }

    [Fact]
    public async Task Map_is_capped_at_500_and_reports_truncation()
    {
        await factory.ResetAsync();
        var now = TestData.Now;
        var ids = new List<Guid>();
        await factory.WithDb(async db =>
        {
            var owner = NewUser("cap-owner");
            db.Users.Add(owner);
            for (var i = 0; i < 501; i++)
            {
                var e = NewEvent(owner.Id, $"cap-{i}", EventVisibility.Public, now + Duration.FromMinutes(i + 1), now + Duration.FromMinutes(i + 61));
                ids.Add(e.Id);
                db.Events.Add(e);
            }

            await db.SaveChangesAsync();
        });

        var page = await GetMapAsync(null);
        Assert.Equal(500, page.Items.Count);
        Assert.True(page.Truncated);
        Assert.Equal(ids[0], page.Items[0].Id);
        Assert.DoesNotContain(page.Items, item => item.Id == ids[^1]);
    }

    [Fact]
    public async Task Detail_returns_404_without_revealing_hidden_events_and_counts_only_attending()
    {
        await factory.ResetAsync();
        Guid id = Guid.Empty;
        await factory.WithDb(async db =>
        {
            var owner = NewUser("owner");
            var attendee = NewUser("attending");
            var requested = NewUser("requested");
            db.Users.AddRange(owner, attendee, requested);
            var e = NewEvent(owner.Id, "counted", EventVisibility.Public, TestData.Now - Duration.FromMinutes(5), TestData.Now + Duration.FromHours(1));
            id = e.Id;
            db.Events.Add(e);
            db.Attendances.AddRange(
                new AttendanceRow
                {
                    Id = Guid.CreateVersion7(),
                    EventId = e.Id,
                    UserId = attendee.Id,
                    Status = AttendanceStatus.Attending,
                    CreatedAt = TestData.Now,
                },
                new AttendanceRow
                {
                    Id = Guid.CreateVersion7(),
                    EventId = e.Id,
                    UserId = requested.Id,
                    Status = AttendanceStatus.Requested,
                    CreatedAt = TestData.Now,
                });
            await db.SaveChangesAsync();
        });

        var client = factory.CreateClient();
        var ok = await client.SendAsync(ApiJson.Get($"/v1/events/{id}"));
        var body = await ok.Content.Read<EventResponse>();
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        Assert.NotNull(body);
        Assert.Equal(1, body.AttendingCount);
        Assert.False(body.IsOwner);
        Assert.Null(body.ShareToken);
        Assert.Equal(TestData.InsideLng, body.Longitude, precision: 5);
        Assert.Equal(TestData.InsideLat, body.Latitude, precision: 5);

        var hidden = await client.SendAsync(ApiJson.Get($"/v1/events/{Guid.CreateVersion7()}"));
        Assert.Equal(HttpStatusCode.NotFound, hidden.StatusCode);
        var problem = await hidden.Content.Read<ProblemDetails>();
        Assert.Equal(ProblemTypes.NotFound, problem!.Type);
        Assert.DoesNotContain("forbidden", problem.Detail, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task First_authenticated_call_creates_a_user_from_standard_claims()
    {
        await factory.ResetAsync();
        await SeedAsync("public");
        var client = factory.CreateClient();
        var response = await client.SendAsync(ApiJson.Get($"/v1/events?bbox={TestData.Bbox}", "ada"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var user = await factory.WithDb(db => db.Users.SingleAsync(row => row.Subject == "ada"));
        Assert.Equal(TestData.Issuer, user.Issuer);
        Assert.Equal("ada@example.com", user.Email);
        Assert.Equal("ada", user.DisplayName);
        Assert.Null(user.Language);
    }

    private async Task<EventMapResponse> GetMapAsync(string? subject, params string[] tags)
    {
        var query = tags.Length == 0
            ? ""
            : "&" + string.Join("&", tags.Select(tag => "tags=" + Uri.EscapeDataString(tag)));
        var response = await factory.CreateClient().SendAsync(
            ApiJson.Get($"/v1/events?bbox={TestData.Bbox}{query}", subject));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.Read<EventMapResponse>())!;
    }

    private Task<Guid> SeedAsync(
        string title,
        double? lng = null,
        double? lat = null,
        Instant? start = null,
        Instant? end = null,
        EventTag[]? tags = null) =>
        factory.WithDb(async db =>
        {
            var owner = NewUser("seed-" + title);
            db.Users.Add(owner);
            var e = NewEvent(
                owner.Id,
                title,
                EventVisibility.Public,
                start ?? TestData.Now + Duration.FromHours(1),
                end ?? TestData.Now + Duration.FromHours(2),
                lng ?? TestData.InsideLng,
                lat ?? TestData.InsideLat,
                tags ?? []);
            db.Events.Add(e);
            await db.SaveChangesAsync();
            return e.Id;
        });

    internal static Happengo.Api.Identity.User NewUser(string subject) => new()
    {
        Id = Guid.CreateVersion7(),
        Issuer = TestData.Issuer,
        Subject = subject,
        CreatedAt = TestData.Now,
    };

    internal static Event NewEvent(
        Guid ownerId,
        string title,
        EventVisibility visibility,
        Instant start,
        Instant end,
        double lng = TestData.InsideLng,
        double lat = TestData.InsideLat,
        EventTag[]? tags = null) => new()
        {
            Id = Guid.CreateVersion7(),
            OwnerId = ownerId,
            Title = title,
            Description = title + " description",
            StartAt = start,
            EndAt = end,
            TimeZoneId = "Europe/Tallinn",
            Location = GeoPoint.FromLngLat(lng, lat),
            Address = "Telliskivi 60a, Tallinn",
            Visibility = visibility,
            ApprovalMode = ApprovalMode.Open,
            ShareToken = ShareToken.New(),
            Tags = tags?.ToList() ?? [],
            CreatedAt = TestData.Now,
            UpdatedAt = TestData.Now,
        };
}
