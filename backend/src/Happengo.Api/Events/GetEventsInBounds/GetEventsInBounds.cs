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
}

internal static class GetEventsInBounds
{
    public static RouteGroupBuilder Map(RouteGroupBuilder group)
    {
        group.MapGet("/events", Handle)
            .AllowAnonymous()
            .WithName("ListEventsInBounds")
            .WithTags("Events")
            .WithSummary("Events in the map viewport that have not ended.")
            .WithDescription(
                "bbox is minLng,minLat,maxLng,maxLat (SRID 4326). "
                + "Uses location && ST_MakeEnvelope. Unlisted events are never returned. "
                + "At most 500 events, happening-now first, then start time. "
                + "truncated is true when more events matched. "
                + "tags keeps events that have any of the named tags.")
            .Produces<EventMapResponse>()
            .ProducesProblem(StatusCodes.Status400BadRequest);

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
        var viewer = viewerContext.Viewer;
        var query = db.Events
            .InBoundingBox(box)
            .AsNoTracking()
            .VisibleTo(db, viewer, now, EventReadScope.Map)
            .Where(e => e.EndAt > now);

        if (tags.Count > 0)
        {
            query = query.Where(e => e.Tags.Any(tag => tags.Contains(tag)));
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
        var items = rows
            .Select(e => e.ToResponse(viewer.UserId, now, counts.GetValueOrDefault(e.Id), includeShareToken: false))
            .ToArray();

        return TypedResults.Ok(new EventMapResponse(items, EventQueries.MapResultLimit, truncated));
    }
}
