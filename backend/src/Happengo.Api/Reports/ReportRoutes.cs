using Happengo.Api.Events;
using Happengo.Api.Infrastructure;
using Happengo.Api.Infrastructure.Auth;
using Happengo.Api.Infrastructure.Persistence;
using Happengo.Api.Incidents;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Happengo.Api.Reports;

public sealed record CreateReportRequest(ReportTargetType TargetType, Guid TargetId, ReportReason Reason);
public sealed record ReportResponse(ReportTargetType TargetType, Guid TargetId, ReportReason Reason, DateTimeOffset CreatedAt, int ReportCount, bool PriorityReview);

internal static class ReportRoutes
{
    public static RouteGroupBuilder Map(RouteGroupBuilder group)
    {
        group.MapPost("/reports", Create)
            .AllowAnonymous()
            .RequireRateLimiting(RateLimitPolicies.Writes)
            .WithName("CreateReport")
            .WithTags("Reports")
            .WithSummary("Report an event or incident for moderator review.")
            .Produces<ReportResponse>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);
        return group;
    }

    private static async Task<Results<Created<ReportResponse>, ProblemHttpResult>> Create(
        CreateReportRequest request,
        HappengoDbContext db,
        ViewerContext viewer,
        IClock clock,
        CancellationToken cancellationToken)
    {
        if (viewer.Viewer.UserId is not Guid reporterId)
            return Problems.Unauthorized("A signed-in user is required to submit a report.");
        if (!Enum.IsDefined(request.TargetType) || !Enum.IsDefined(request.Reason) || request.TargetId == Guid.Empty)
            return Problems.InvalidReport("Choose a supported target type, target id, and reason.");

        var now = clock.GetCurrentInstant();
        var targetExists = request.TargetType switch
        {
            ReportTargetType.Event => await EventAccess.IsReportableAsync(db, request.TargetId, reporterId, now, cancellationToken),
            ReportTargetType.Incident => await IncidentAccess.IsReportableAsync(db, request.TargetId, now, cancellationToken),
            _ => false,
        };
        if (!targetExists) return Problems.NotFoundReportTarget();

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var lockKey = $"{reporterId:N}:{ReportConfiguration.TargetTypeToStored(request.TargetType)}:{request.TargetId:N}";
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT pg_advisory_xact_lock(hashtextextended({lockKey}, 0))", cancellationToken);
        if (await db.Reports.AnyAsync(row => row.ReporterUserId == reporterId
            && row.TargetType == request.TargetType && row.TargetId == request.TargetId, cancellationToken))
            return Problems.ReportConflict();

        db.Reports.Add(new Report
        {
            Id = Guid.NewGuid(),
            ReporterUserId = reporterId,
            TargetType = request.TargetType,
            TargetId = request.TargetId,
            Reason = request.Reason,
            CreatedAt = now,
        });
        await db.SaveChangesAsync(cancellationToken);
        var reportCount = await db.Reports.CountAsync(row => row.TargetType == request.TargetType && row.TargetId == request.TargetId, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        var response = new ReportResponse(request.TargetType, request.TargetId, request.Reason, now.ToDateTimeOffset(), reportCount, reportCount >= 3);
        return TypedResults.Created((string?)null, response);
    }
}
