using Happengo.Api.Attendance;
using Happengo.Api.Infrastructure;
using Happengo.Api.Infrastructure.Auth;
using Happengo.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Happengo.Api.Events.GetEventsInBounds;

internal sealed record ListEventsRequest
{
    [FromQuery(Name = "bbox")]
    public string? Bbox { get; init; }

    [FromQuery(Name = "tags")]
    public string[]? Tags { get; init; }

    [FromQuery(Name = "happeningNow")]
    public bool? HappeningNow { get; init; }

    [FromQuery(Name = "when")]
    public string? When { get; init; }

    [FromQuery(Name = "timeZoneId")]
    public string? TimeZoneId { get; init; }
}

internal static class GetEventsInBounds
{
    public static RouteGroupBuilder Map(RouteGroupBuilder group)
    {
        group.MapGet("/events", Handle)
            .AllowAnonymous()
            .RequireRateLimiting(RateLimitPolicies.MapReads)
            .WithName("ListEventsInBounds")
            .WithTags("Events")
            .WithSummary("Events in the map viewport that have not ended.")
            .WithDescription(
                "bbox is minLng,minLat,maxLng,maxLat (SRID 4326). "
                + "Uses location && ST_MakeEnvelope. Unlisted events are never returned. "
                + "At most 500 events, happening-now first, then start time. "
                + "truncated is true when more events matched. "
                + "tags keeps events that have any of the named tags. "
                + "happeningNow keeps only events with start_at <= now < end_at. "
                + "when is now (default), today, weekend, or next7days. "
                + "timeZoneId is an IANA time zone used for local date boundaries (default Europe/Tallinn).")
            .Produces<EventMapResponse>()
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status429TooManyRequests);

        return group;
    }

    private static async Task<Results<Ok<EventMapResponse>, ProblemHttpResult>> Handle(
        [AsParameters] ListEventsRequest request,
        HappengoDbContext db,
        ViewerContext viewerContext,
        IClock clock,
        CancellationToken cancellationToken)
    {
        if (!BoundingBoxParser.TryParse(request.Bbox, out var box, out var bboxDetail))
        {
            return Problems.InvalidBbox(bboxDetail);
        }

        if (!EventTagParser.TryParse(request.Tags, out var tags, out var tagDetail))
        {
            return Problems.InvalidTags(tagDetail);
        }

        var now = clock.GetCurrentInstant();
        if (!TryGetWindow(request.When, request.TimeZoneId, now, out var window, out var dateRangeDetail))
        {
            return Problems.InvalidDateRange(dateRangeDetail);
        }

        var viewer = viewerContext.Viewer;
        var query = db.Events
            .InBoundingBox(box)
            .AsNoTracking()
            .VisibleTo(db, viewer, now, EventReadScope.Map);

        if (tags.Count > 0)
        {
            query = query.Where(e => e.Tags.Any(tag => tags.Contains(tag)));
        }

        if (request.HappeningNow == true)
        {
            query = query.Where(e => e.StartAt <= now && e.EndAt > now);
        }

        if (window is { } range)
        {
            query = query.Where(e => e.StartAt < range.End && e.EndAt > range.Start);
        }

        var rows = await query
            .OrderForDiscovery(now)
            .Take(EventQueries.MapResultLimit + 1)
            .ToListAsync(cancellationToken);

        var truncated = rows.Count > EventQueries.MapResultLimit;
        if (truncated)
        {
            rows.RemoveAt(rows.Count - 1);
        }

        var counts = await AttendanceAccess.AttendingCountsAsync(db, rows.Select(e => e.Id).ToArray(), cancellationToken);
        var items = await rows.ToResponsesAsync(db, viewer.UserId, now, counts, cancellationToken);

        return TypedResults.Ok(new EventMapResponse(items, EventQueries.MapResultLimit, truncated));
    }

    private static bool TryGetWindow(
        string? when,
        string? timeZoneId,
        Instant now,
        out (Instant Start, Instant End)? window,
        out string detail)
    {
        window = null;
        var effectiveTimeZoneId = string.IsNullOrWhiteSpace(timeZoneId) ? "Europe/Tallinn" : timeZoneId;
        var zone = DateTimeZoneProviders.Tzdb.GetZoneOrNull(effectiveTimeZoneId);
        if (zone is null)
        {
            detail = "timeZoneId must be a valid IANA time zone.";
            return false;
        }

        var date = now.InZone(zone).Date;
        switch (when ?? "now")
        {
            case "now":
                detail = "";
                return true;
            case "today":
                window = (date.AtStartOfDayInZone(zone).ToInstant(), date.PlusDays(1).AtStartOfDayInZone(zone).ToInstant());
                break;
            case "weekend":
                var daysUntilSaturday = ((int)IsoDayOfWeek.Saturday - (int)date.DayOfWeek + 7) % 7;
                var saturday = date.DayOfWeek == IsoDayOfWeek.Sunday
                    ? date.PlusDays(-1)
                    : date.PlusDays(daysUntilSaturday);
                window = (saturday.AtStartOfDayInZone(zone).ToInstant(), saturday.PlusDays(2).AtStartOfDayInZone(zone).ToInstant());
                break;
            case "next7days":
                var localNow = now.InZone(zone).LocalDateTime;
                window = (now, localNow.PlusDays(7).InZoneLeniently(zone).ToInstant());
                break;
            default:
                detail = "when must be one of: now, today, weekend, next7days.";
                return false;
        }

        detail = "";
        return true;
    }
}
