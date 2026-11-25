using Happengo.Api.Events;
using Happengo.Api.Identity;
using Happengo.Api.Infrastructure;
using Happengo.Api.Infrastructure.Auth;
using Happengo.Api.Infrastructure.Persistence;
using Happengo.Api.Incidents;
using Happengo.Api.Reports;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Happengo.Api.Moderation;

internal sealed record ModerationActionRequest(string? Reason);
internal sealed record ModerationQueueItem(
    ReportTargetType TargetType,
    Guid TargetId,
    string? Title,
    IncidentCategory? Category,
    string? Description,
    string? Address,
    int ReportCount,
    bool PriorityReview,
    DateTimeOffset LatestReportedAt,
    IReadOnlyList<ReportReason> Reasons,
    bool Resolved);
internal sealed record ModerationQueueResponse(IReadOnlyList<ModerationQueueItem> Items);
internal sealed record ModerationActionResponse(ReportTargetType TargetType, Guid TargetId, string Action, string Reason, DateTimeOffset At);

internal static class ModerationRoutes
{
    public static RouteGroupBuilder Map(RouteGroupBuilder group)
    {
        group.MapGet("/moderation/queue", Queue)
            .WithName("GetModerationQueue")
            .WithTags("Moderation")
            .WithSummary("Get the moderator report queue, with priority targets first.")
            .Produces<ModerationQueueResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);
        group.MapPost("/moderation/incidents/{id:guid}/close", CloseIncident)
            .RequireRateLimiting(RateLimitPolicies.Writes)
            .WithName("ModerateCloseIncident")
            .WithTags("Moderation")
            .Produces<ModerationActionResponse>()
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);
        group.MapPost("/moderation/events/{id:guid}/hide", HideEvent)
            .RequireRateLimiting(RateLimitPolicies.Writes)
            .WithName("ModerateHideEvent")
            .WithTags("Moderation")
            .Produces<ModerationActionResponse>()
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);
        return group;
    }

    private static async Task<Results<Ok<ModerationQueueResponse>, ProblemHttpResult>> Queue(
        HappengoDbContext db, ViewerContext viewer, IClock clock, CancellationToken cancellationToken)
    {
        if (viewer.Viewer.UserId is not Guid userId) return Problems.Unauthorized("A signed-in moderator is required.");
        if (!await IsModeratorAsync(db, userId, cancellationToken)) return Problems.NotFoundModeration();

        var groups = await ReportAccess.ModerationQueueAsync(db, cancellationToken);
        var ordered = groups
            .OrderByDescending(row => row.ReportCount >= 3)
            .ThenByDescending(row => row.LatestReportedAt).ToArray();
        if (ordered.Length == 0) return TypedResults.Ok(new ModerationQueueResponse([]));

        var eventIds = ordered.Where(row => row.TargetType == ReportTargetType.Event).Select(row => row.TargetId).ToArray();
        var incidentIds = ordered.Where(row => row.TargetType == ReportTargetType.Incident).Select(row => row.TargetId).ToArray();
        var now = clock.GetCurrentInstant();
        var events = await EventAccess.GetModerationSummariesAsync(db, eventIds, cancellationToken);
        var incidents = await IncidentAccess.GetModerationSummariesAsync(db, incidentIds, now, cancellationToken);
        var eventsById = events.ToDictionary(row => row.Id);
        var incidentsById = incidents.ToDictionary(row => row.Id);
        var items = ordered.Select(row =>
        {
            string? title = null;
            IncidentCategory? category = null;
            string? description = null;
            string? address = null;
            var resolved = false;
            if (row.TargetType == ReportTargetType.Event && eventsById.TryGetValue(row.TargetId, out var eventSummary))
            {
                title = eventSummary.Title;
                description = eventSummary.Description;
                address = eventSummary.Address;
                resolved = eventSummary.IsHidden;
            }
            else if (row.TargetType == ReportTargetType.Incident && incidentsById.TryGetValue(row.TargetId, out var incidentSummary))
            {
                category = incidentSummary.Category;
                description = incidentSummary.Description;
                address = incidentSummary.Address;
                resolved = !incidentSummary.IsActive;
            }
            return new ModerationQueueItem(
                row.TargetType, row.TargetId, title, category, description, address, row.ReportCount, row.ReportCount >= 3,
                row.LatestReportedAt.ToDateTimeOffset(), row.Reasons, resolved);
        }).ToArray();
        return TypedResults.Ok(new ModerationQueueResponse(items));
    }

    private static async Task<Results<Ok<ModerationActionResponse>, ProblemHttpResult>> CloseIncident(
        Guid id, ModerationActionRequest request, HappengoDbContext db, ViewerContext viewer, IClock clock, CancellationToken cancellationToken)
    {
        if (viewer.Viewer.UserId is not Guid userId) return Problems.Unauthorized("A signed-in moderator is required.");
        if (!await IsModeratorAsync(db, userId, cancellationToken)) return Problems.NotFoundModeration();
        var reason = request.Reason?.Trim();
        if (string.IsNullOrWhiteSpace(reason) || reason.Length > 500) return Problems.InvalidModerationAction("A reason of 1 to 500 characters is required.");
        if (!await IncidentAccess.ExistsAsync(db, id, cancellationToken)) return Problems.NotFoundIncident();

        var now = clock.GetCurrentInstant();
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        if (!await IncidentAccess.CloseByModeratorAsync(db, id, userId, now, cancellationToken))
            return Problems.ModerationConflict("The incident is no longer active.");
        db.ModerationActions.Add(new ModerationAction
        {
            Id = Guid.NewGuid(), ActorUserId = userId, TargetType = "incident", TargetId = id,
            Action = "close_incident", Reason = reason, At = now,
        });
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return TypedResults.Ok(new ModerationActionResponse(ReportTargetType.Incident, id, "close_incident", reason, now.ToDateTimeOffset()));
    }

    private static async Task<Results<Ok<ModerationActionResponse>, ProblemHttpResult>> HideEvent(
        Guid id, ModerationActionRequest request, HappengoDbContext db, ViewerContext viewer, IClock clock, CancellationToken cancellationToken)
    {
        if (viewer.Viewer.UserId is not Guid userId) return Problems.Unauthorized("A signed-in moderator is required.");
        if (!await IsModeratorAsync(db, userId, cancellationToken)) return Problems.NotFoundModeration();
        var reason = request.Reason?.Trim();
        if (string.IsNullOrWhiteSpace(reason) || reason.Length > 500) return Problems.InvalidModerationAction("A reason of 1 to 500 characters is required.");
        if (!await EventAccess.ExistsAsync(db, id, cancellationToken)) return Problems.NotFoundEvent();

        var now = clock.GetCurrentInstant();
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        if (!await EventAccess.HideAsync(db, id, now, reason, cancellationToken))
            return Problems.ModerationConflict("This event is already hidden.");
        db.ModerationActions.Add(new ModerationAction
        {
            Id = Guid.NewGuid(), ActorUserId = userId, TargetType = "event", TargetId = id,
            Action = "hide_event", Reason = reason, At = now,
        });
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return TypedResults.Ok(new ModerationActionResponse(ReportTargetType.Event, id, "hide_event", reason, now.ToDateTimeOffset()));
    }

    private static Task<bool> IsModeratorAsync(HappengoDbContext db, Guid userId, CancellationToken cancellationToken) =>
        UserDirectory.IsModeratorAsync(db, userId, cancellationToken);
}
