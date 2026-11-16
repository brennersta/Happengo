using Happengo.Api.Attendance;
using Happengo.Api.Infrastructure;
using Happengo.Api.Infrastructure.Auth;
using Happengo.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Happengo.Api.Events.GetSharedEvent;

internal static class GetSharedEvent
{
    public static RouteGroupBuilder Map(RouteGroupBuilder group)
    {
        group.MapGet("/events/shared/{token}", Handle)
            .AllowAnonymous()
            .WithName("GetSharedEvent")
            .WithTags("Events")
            .WithSummary("Read a live unlisted event by its share token.")
            .WithDescription("The token does not reveal public or friends-only events, and it does not reveal an event that has ended.")
            .Produces<EventResponse>()
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<Results<Ok<EventResponse>, ProblemHttpResult>> Handle(
        string token,
        HappengoDbContext db,
        ViewerContext viewerContext,
        IClock clock,
        CancellationToken cancellationToken)
    {
        if (!ShareToken.TryCanonicalize(token, out var canonical))
        {
            return Problems.NotFoundEvent();
        }

        var now = clock.GetCurrentInstant();
        var e = await db.Events
            .AsNoTracking()
            .VisibleByShareToken(canonical, now)
            .FirstOrDefaultAsync(cancellationToken);

        if (e is null)
        {
            return Problems.NotFoundEvent();
        }

        var viewer = viewerContext.Viewer;
        var counts = await AttendanceAccess.AttendingCountsAsync(db, [e.Id], cancellationToken);
        return TypedResults.Ok(e.ToResponse(
            viewer.UserId,
            now,
            counts.GetValueOrDefault(e.Id),
            includeShareToken: true));
    }
}
