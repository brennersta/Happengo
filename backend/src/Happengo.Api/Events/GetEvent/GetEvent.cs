using Happengo.Api.Attendance;
using Happengo.Api.Infrastructure;
using Happengo.Api.Infrastructure.Auth;
using Happengo.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Happengo.Api.Events.GetEvent;

internal static class GetEvent
{
    public static RouteGroupBuilder Map(RouteGroupBuilder group)
    {
        group.MapGet("/events/{id:guid}", Handle)
            .AllowAnonymous()
            .WithName("GetEvent")
            .WithTags("Events")
            .WithSummary("One event the caller is allowed to read.")
            .WithDescription(
                "Hidden, unlisted (without being the owner), and ended events the caller did not attend return 404. "
                + "The share token is not returned; only its hash is stored.")
            .Produces<EventResponse>()
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<Results<Ok<EventResponse>, ProblemHttpResult>> Handle(
        Guid id,
        HappengoDbContext db,
        ViewerContext viewerContext,
        IClock clock,
        CancellationToken cancellationToken)
    {
        var now = clock.GetCurrentInstant();
        var viewer = viewerContext.Viewer;
        var e = await db.Events
            .AsNoTracking()
            .VisibleTo(db, viewer, now, EventReadScope.Direct)
            .FirstOrDefaultAsync(row => row.Id == id, cancellationToken);

        if (e is null)
        {
            return Problems.NotFoundEvent();
        }

        var counts = await AttendanceAccess.AttendingCountsAsync(db, [e.Id], cancellationToken);
        var items = await new[] { e }.ToResponsesAsync(db, viewer.UserId, now, counts, cancellationToken);
        return TypedResults.Ok(items[0]);
    }
}
