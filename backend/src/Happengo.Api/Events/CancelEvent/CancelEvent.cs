using Happengo.Api.Attendance;
using Happengo.Api.Infrastructure;
using Happengo.Api.Infrastructure.Auth;
using Happengo.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Happengo.Api.Events.CancelEvent;

internal static class CancelEvent
{
    public static RouteGroupBuilder Map(RouteGroupBuilder group)
    {
        group.MapPost("/events/{eventId:guid}/cancel", Handle)
            .AllowAnonymous()
            .RequireRateLimiting(RateLimitPolicies.Writes)
            .WithName("CancelEvent")
            .WithTags("Events")
            .WithSummary("Cancel an event owned by the caller.")
            .Produces<EventResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<Results<Ok<EventResponse>, ProblemHttpResult>> Handle(
        Guid eventId,
        HappengoDbContext db,
        ViewerContext viewerContext,
        IClock clock,
        CancellationToken cancellationToken)
    {
        if (viewerContext.Viewer.UserId is not Guid ownerId)
        {
            return Problems.Unauthorized("A valid user identity is required to cancel an event.");
        }

        var e = await db.Events.FirstOrDefaultAsync(
            row => row.Id == eventId && row.OwnerId == ownerId,
            cancellationToken);
        if (e is null)
        {
            return Problems.NotFoundEvent();
        }

        if (e.CancelledAt is null)
        {
            var now = clock.GetCurrentInstant();
            e.CancelledAt = now;
            e.UpdatedAt = now;
            await db.SaveChangesAsync(cancellationToken);
        }

        var current = clock.GetCurrentInstant();
        var counts = await AttendanceAccess.AttendingCountsAsync(db, [eventId], cancellationToken);
        var responses = await new[] { e }.ToResponsesAsync(db, ownerId, current, counts, cancellationToken);
        return TypedResults.Ok(responses[0]);
    }
}
