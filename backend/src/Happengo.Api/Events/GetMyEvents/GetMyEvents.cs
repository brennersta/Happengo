using Happengo.Api.Attendance;
using Happengo.Api.Infrastructure.Auth;
using Happengo.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Happengo.Api.Events.GetMyEvents;

internal static class GetMyEvents
{
    public static RouteGroupBuilder Map(RouteGroupBuilder group)
    {
        group.MapGet("/events/mine", Handle)
            .WithName("GetMyEvents")
            .WithTags("Events")
            .WithSummary("List events the caller owns or attends, including past events.")
            .WithDescription(
                "Requires authentication. Returns events the caller owns, events they are attending "
                + "(including after the event ends), and events with an active request. "
                + "Rejected and cancelled attendance is omitted, and other users' events are omitted.")
            .Produces<EventMapResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        return group;
    }

    private static async Task<Results<Ok<EventMapResponse>, ProblemHttpResult>> Handle(
        HappengoDbContext db,
        ViewerContext viewerContext,
        IClock clock,
        CancellationToken cancellationToken)
    {
        if (viewerContext.Viewer.UserId is not Guid userId)
        {
            return TypedResults.Problem(statusCode: StatusCodes.Status401Unauthorized,
                title: "Authentication required", detail: "A valid user identity is required to list your events.");
        }

        var now = clock.GetCurrentInstant();
        var myAttendanceIds = AttendanceAccess.EventIdsForMyEvents(db, userId);
        var attendingIds = AttendanceAccess.EventIdsAttendedBy(db, userId);
        var rows = await db.Events.AsNoTracking()
            .Where(e => e.OwnerId == userId
                || (myAttendanceIds.Contains(e.Id) && (e.EndAt > now || attendingIds.Contains(e.Id))))
            .OrderBy(e => e.StartAt <= now)
            .ThenBy(e => e.StartAt)
            .Take(EventQueries.MapResultLimit + 1)
            .ToListAsync(cancellationToken);
        var truncated = rows.Count > EventQueries.MapResultLimit;
        if (truncated) rows.RemoveAt(rows.Count - 1);

        var counts = await AttendanceAccess.AttendingCountsAsync(db, rows.Select(e => e.Id).ToArray(), cancellationToken);
        var items = rows.Select(e => e.ToResponse(userId, now, counts.GetValueOrDefault(e.Id))).ToArray();
        return TypedResults.Ok(new EventMapResponse(items, EventQueries.MapResultLimit, truncated));
    }
}
