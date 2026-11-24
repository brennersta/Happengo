using Happengo.Api.Attendance;
using Happengo.Api.Events.CreateEvent;
using Happengo.Api.Infrastructure;
using Happengo.Api.Infrastructure.Auth;
using Happengo.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Happengo.Api.Events.EditEvent;

internal static class EditEvent
{
    public static RouteGroupBuilder Map(RouteGroupBuilder group)
    {
        group.MapPatch("/events/{eventId:guid}", Handle)
            .AllowAnonymous()
            .RequireRateLimiting(RateLimitPolicies.Writes)
            .WithName("EditEvent")
            .WithTags("Events")
            .WithSummary("Update editable details of an event owned by the caller.")
            .WithDescription("Requires authentication. Visibility and approval mode stay unchanged. Edits to ended events conflict.")
            .Produces<EventResponse>()
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        return group;
    }

    private static async Task<Results<Ok<EventResponse>, ProblemHttpResult>> Handle(
        Guid eventId,
        EditEventRequest request,
        HappengoDbContext db,
        ViewerContext viewerContext,
        IClock clock,
        CancellationToken cancellationToken)
    {
        if (viewerContext.Viewer.UserId is not Guid ownerId)
        {
            return Problems.Unauthorized("A valid user identity is required to edit an event.");
        }

        var e = await db.Events.FirstOrDefaultAsync(
            row => row.Id == eventId && row.OwnerId == ownerId,
            cancellationToken);
        if (e is null)
        {
            return Problems.NotFoundEvent();
        }

        var now = clock.GetCurrentInstant();
        if (e.EndAt <= now)
        {
            return Problems.EventConflict("An event that has ended cannot be edited.");
        }

        var createRequest = new CreateEventRequest
        {
            Title = request.Title,
            Description = request.Description,
            StartAt = request.StartAt,
            EndAt = request.EndAt,
            TimeZoneId = request.TimeZoneId,
            Address = request.Address,
            Longitude = request.Longitude,
            Latitude = request.Latitude,
            Visibility = e.Visibility,
            ApprovalMode = e.ApprovalMode,
            Tags = request.Tags,
            InvitedFriendTags = request.InvitedFriendTags,
        };

        if (!CreateEventValidator.TryValidate(createRequest, now, out var validated, out var detail))
        {
            return Problems.InvalidEvent(detail);
        }

        e.Title = validated!.Title;
        e.Description = validated.Description;
        e.StartAt = validated.StartAt;
        e.EndAt = validated.EndAt;
        e.TimeZoneId = validated.TimeZoneId;
        e.Address = validated.Address;
        e.Location = GeoPoint.FromLngLat(validated.Longitude, validated.Latitude);
        e.Tags = validated.Tags;
        e.UpdatedAt = now;

        var oldFriendTags = await db.EventInvitedFriendTags
            .Where(tag => tag.EventId == eventId)
            .ToListAsync(cancellationToken);
        db.EventInvitedFriendTags.RemoveRange(oldFriendTags);
        foreach (var tag in validated.InvitedFriendTags)
        {
            db.EventInvitedFriendTags.Add(new EventInvitedFriendTag
            {
                Id = Guid.CreateVersion7(),
                EventId = eventId,
                NormalizedTag = tag.Normalized,
                Label = tag.Label,
            });
        }

        await db.SaveChangesAsync(cancellationToken);
        var counts = await AttendanceAccess.AttendingCountsAsync(db, [eventId], cancellationToken);
        var responses = await new[] { e }.ToResponsesAsync(db, ownerId, now, counts, cancellationToken);
        return TypedResults.Ok(responses[0]);
    }
}
