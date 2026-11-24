using Happengo.Api.Events;
using Happengo.Api.Infrastructure;
using Happengo.Api.Infrastructure.Auth;
using Happengo.Api.Infrastructure.Persistence;
using NodaTime;

namespace Happengo.Api.Attendance;

public sealed record JoinEventRequest(string? ShareToken);

public sealed record AttendanceResponse(Guid EventId, AttendanceStatus Status, int AttendingCount);

public sealed record MyAttendanceResponse(Guid EventId, AttendanceStatus? Status);

public sealed record PendingAttendanceRequest(Guid UserId, string? DisplayName, DateTimeOffset RequestedAt);

public sealed record PendingAttendanceResponse(IReadOnlyList<PendingAttendanceRequest> Requests);

internal static class AttendanceRoutes
{
    public static RouteGroupBuilder Map(RouteGroupBuilder group)
    {
        var attendance = group.MapGroup("/events/{eventId:guid}/attendance")
            .RequireRateLimiting(RateLimitPolicies.Writes)
            .WithTags("Attendance");

        attendance.MapPost("", Join)
            .WithName("RequestEventAttendance")
            .WithSummary("Join an event or request to attend.")
            .Produces<AttendanceResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        attendance.MapGet("requests", GetPending)
            .WithName("GetEventAttendanceRequests")
            .WithSummary("List pending attendance requests for an event owner.")
            .Produces<PendingAttendanceResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        attendance.MapGet("me", GetMine)
            .WithName("GetMyEventAttendance")
            .WithSummary("Get the caller's attendance state for an event.")
            .Produces<MyAttendanceResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        attendance.MapPost("requests/{userId:guid}/approve", Approve)
            .WithName("ApproveEventAttendance")
            .WithSummary("Approve a pending attendance request.")
            .Produces<AttendanceResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        attendance.MapPost("requests/{userId:guid}/reject", Reject)
            .WithName("RejectEventAttendance")
            .WithSummary("Reject a pending attendance request.")
            .Produces<AttendanceResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        attendance.MapPost("cancel", Cancel)
            .WithName("CancelEventAttendance")
            .WithSummary("Cancel the caller's own attendance.")
            .Produces<AttendanceResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        return group;
    }

    private static async Task<IResult> Join(
        Guid eventId,
        JoinEventRequest request,
        HappengoDbContext db,
        ViewerContext viewerContext,
        IClock clock,
        CancellationToken cancellationToken)
    {
        if (viewerContext.Viewer.UserId is not Guid userId)
        {
            return Unauthorized();
        }

        var now = clock.GetCurrentInstant();
        var context = await EventAccess.FindAttendanceContextAsync(
            db, eventId, userId, request.ShareToken, cancellationToken);
        if (context is null || !await CanAttendAsync(db, context, userId, eventId, now, cancellationToken))
        {
            return Problems.NotFoundEvent();
        }

        if (context.CancelledAt is not null)
        {
            return Problems.EventConflict("Attendance cannot be requested for a cancelled event.");
        }

        if (context.EndAt <= now)
        {
            return Problems.InvalidAttendance("Attendance cannot be requested after an event has ended.");
        }

        if (context.OwnerId == userId)
        {
            return Problems.InvalidAttendance("The event owner is already attending.");
        }

        var next = context.ApprovalMode == ApprovalMode.Open
            ? AttendanceStatus.Attending
            : AttendanceStatus.Requested;
        var mutation = await AttendanceAccess.RequestAsync(db, eventId, userId, next, now, cancellationToken);
        if (!mutation.Succeeded || mutation.Status is null)
        {
            return Problems.InvalidAttendance("A rejected or cancelled request cannot be reopened under the current attendance policy.");
        }

        return await CurrentResponse(db, eventId, mutation.Status.Value, cancellationToken);
    }

    private static async Task<IResult> GetPending(
        Guid eventId,
        HappengoDbContext db,
        ViewerContext viewerContext,
        CancellationToken cancellationToken)
    {
        if (viewerContext.Viewer.UserId is not Guid ownerId
            || !await EventAccess.IsOwnerAsync(db, eventId, ownerId, cancellationToken))
        {
            return Problems.NotFoundEvent();
        }

        var requests = await AttendanceAccess.PendingRequestsAsync(db, eventId, cancellationToken);
        return Results.Ok(new PendingAttendanceResponse(requests));
    }

    private static async Task<IResult> GetMine(
        Guid eventId,
        string? shareToken,
        HappengoDbContext db,
        ViewerContext viewerContext,
        IClock clock,
        CancellationToken cancellationToken)
    {
        if (viewerContext.Viewer.UserId is not Guid userId)
        {
            return Unauthorized();
        }

        var now = clock.GetCurrentInstant();
        var context = await EventAccess.FindAttendanceContextAsync(db, eventId, userId, shareToken, cancellationToken);
        if (context is null || !await CanAttendAsync(db, context, userId, eventId, now, cancellationToken) && context.OwnerId != userId)
        {
            return Problems.NotFoundEvent();
        }

        var status = await AttendanceAccess.GetStatusAsync(db, eventId, userId, cancellationToken);
        return Results.Ok(new MyAttendanceResponse(eventId, status));
    }

    private static Task<IResult> Approve(
        Guid eventId,
        Guid userId,
        HappengoDbContext db,
        ViewerContext viewerContext,
        IClock clock,
        CancellationToken cancellationToken) =>
        Decide(eventId, userId, AttendanceStatus.Attending, db, viewerContext, clock, cancellationToken);

    private static Task<IResult> Reject(
        Guid eventId,
        Guid userId,
        HappengoDbContext db,
        ViewerContext viewerContext,
        IClock clock,
        CancellationToken cancellationToken) =>
        Decide(eventId, userId, AttendanceStatus.Rejected, db, viewerContext, clock, cancellationToken);

    private static async Task<IResult> Decide(
        Guid eventId,
        Guid userId,
        AttendanceStatus decision,
        HappengoDbContext db,
        ViewerContext viewerContext,
        IClock clock,
        CancellationToken cancellationToken)
    {
        if (viewerContext.Viewer.UserId is not Guid ownerId)
        {
            return Unauthorized();
        }

        var context = await EventAccess.FindAttendanceContextAsync(db, eventId, ownerId, null, cancellationToken);
        if (context is null || context.OwnerId != ownerId)
        {
            return Problems.NotFoundEvent();
        }

        if (context.EndAt <= clock.GetCurrentInstant())
        {
            return Problems.InvalidAttendance("Attendance requests cannot be changed after an event has ended.");
        }

        if (decision == AttendanceStatus.Attending && context.ApprovalMode != ApprovalMode.Approval)
        {
            return Problems.InvalidAttendance("This event does not use approval requests.");
        }

        var mutation = await AttendanceAccess.TransitionAsync(
            db, eventId, userId, AttendanceStatus.Requested, decision, cancellationToken);
        if (!mutation.Succeeded)
        {
            return Problems.InvalidAttendance("No pending attendance request exists for that user.");
        }

        return await CurrentResponse(db, eventId, decision, cancellationToken);
    }

    private static async Task<IResult> Cancel(
        Guid eventId,
        HappengoDbContext db,
        ViewerContext viewerContext,
        CancellationToken cancellationToken)
    {
        if (viewerContext.Viewer.UserId is not Guid userId)
        {
            return Unauthorized();
        }

        var status = await AttendanceAccess.GetStatusAsync(db, eventId, userId, cancellationToken);
        if (status is null || !await EventAccess.ExistsAsync(db, eventId, cancellationToken))
        {
            return Problems.NotFoundEvent();
        }

        var mutation = await AttendanceAccess.TransitionAsync(
            db, eventId, userId, AttendanceStatus.Attending, AttendanceStatus.Cancelled, cancellationToken);
        if (!mutation.Succeeded)
        {
            return Problems.InvalidAttendance("Only an attending user can cancel attendance.");
        }

        return await CurrentResponse(db, eventId, AttendanceStatus.Cancelled, cancellationToken);
    }

    /// <summary>
    /// Friends-only joining uses <c>VisibleTo</c> so the audience cannot drift from reads (ADR 0011).
    /// </summary>
    private static async Task<bool> CanAttendAsync(
        HappengoDbContext db,
        EventAttendanceContext context,
        Guid userId,
        Guid eventId,
        Instant now,
        CancellationToken cancellationToken)
    {
        if (context.OwnerId == userId)
        {
            return false;
        }

        return context.Visibility switch
        {
            EventVisibility.Public => true,
            EventVisibility.Unlisted => context.ShareTokenMatches,
            EventVisibility.FriendsOnly => await EventAccess.IsVisibleAsync(db, eventId, userId, now, cancellationToken),
            _ => false,
        };
    }

    private static async Task<IResult> CurrentResponse(
        HappengoDbContext db,
        Guid eventId,
        AttendanceStatus status,
        CancellationToken cancellationToken)
    {
        var count = await AttendanceAccess.AttendingCountAsync(db, eventId, cancellationToken);
        return Results.Ok(new AttendanceResponse(eventId, status, count));
    }

    private static IResult Unauthorized() => Results.Problem(
        statusCode: StatusCodes.Status401Unauthorized,
        title: "Authentication required",
        detail: "A valid user identity is required for attendance changes.",
        type: ProblemTypes.Unauthorized);
}
