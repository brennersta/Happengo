using Happengo.Api.Attendance;
using Happengo.Api.Infrastructure;
using Happengo.Api.Infrastructure.Auth;
using Happengo.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Happengo.Api.Events.CreateEvent;

internal static class CreateEvent
{
    public static RouteGroupBuilder Map(RouteGroupBuilder group)
    {
        group.MapPost("/events", Handle)
            .RequireRateLimiting(RateLimitPolicies.Writes)
            .WithName("CreateEvent")
            .WithTags("Events")
            .WithSummary("Create an event and join as its owner.")
            .WithDescription(
                "Requires authentication. StartAt and EndAt are required; StartAt cannot be in the past, "
                + "EndAt must be after StartAt and in the future, and the duration cannot exceed 7 days. "
                + "The owner is created as attending. The server generates the event ID and share token.")
            .Produces<EventResponse>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        return group;
    }

    private static async Task<Results<Created<EventResponse>, ProblemHttpResult>> Handle(
        CreateEventRequest request,
        HappengoDbContext db,
        ViewerContext viewerContext,
        IClock clock,
        CancellationToken cancellationToken)
    {
        var now = clock.GetCurrentInstant();
        if (!CreateEventValidator.TryValidate(request, now, out var validated, out var detail))
        {
            return Problems.InvalidEvent(detail);
        }

        if (viewerContext.Viewer.UserId is not Guid ownerId)
        {
            return TypedResults.Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "Authentication required",
                detail: "A valid user identity is required to create an event.",
                type: ProblemTypes.Unauthorized);
        }

        var e = new Event
        {
            Id = Guid.CreateVersion7(),
            OwnerId = ownerId,
            Title = validated!.Title,
            Description = validated.Description,
            StartAt = validated.StartAt,
            EndAt = validated.EndAt,
            TimeZoneId = validated.TimeZoneId,
            Location = GeoPoint.FromLngLat(validated.Longitude, validated.Latitude),
            Address = validated.Address,
            Visibility = validated.Visibility,
            ShareTokenHash = ShareToken.Hash(ShareToken.New()),
            ApprovalMode = validated.ApprovalMode,
            Tags = validated.Tags,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Events.Add(e);
        foreach (var tag in validated.InvitedFriendTags)
        {
            db.EventInvitedFriendTags.Add(new EventInvitedFriendTag
            {
                Id = Guid.CreateVersion7(),
                EventId = e.Id,
                NormalizedTag = tag.Normalized,
                Label = tag.Label,
            });
        }

        AttendanceAccess.AddOwnerAttending(db, e.Id, ownerId, now);
        await db.SaveChangesAsync(cancellationToken);

        return TypedResults.Created(
            $"/v1/events/{e.Id}",
            e.ToResponse(ownerId, now, attendingCount: 1, validated.InvitedFriendTags.Select(tag => tag.Label).ToArray()));
    }
}
