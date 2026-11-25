using Happengo.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Happengo.Api.Incidents;

public sealed record IncidentModerationSummary(Guid Id, IncidentCategory Category, string Description, string Address, bool IsActive);

public static class IncidentAccess
{
    public static async Task<bool> IsReportableAsync(HappengoDbContext db, Guid incidentId, Instant now, CancellationToken cancellationToken)
    {
        var row = await db.Incidents.AsNoTracking().Where(item => item.Id == incidentId)
            .Select(item => new { item.CreatedAt, item.LastConfirmedAt, item.ClosedAt }).FirstOrDefaultAsync(cancellationToken);
        return row is not null && IncidentActivity.IsActive(row.CreatedAt, row.LastConfirmedAt, row.ClosedAt, now);
    }

    public static Task<bool> ExistsAsync(HappengoDbContext db, Guid incidentId, CancellationToken cancellationToken) =>
        db.Incidents.AsNoTracking().AnyAsync(row => row.Id == incidentId, cancellationToken);

    public static async Task<IReadOnlyList<IncidentModerationSummary>> GetModerationSummariesAsync(
        HappengoDbContext db,
        IReadOnlyCollection<Guid> incidentIds,
        Instant now,
        CancellationToken cancellationToken) =>
        await db.Incidents.AsNoTracking().Where(row => incidentIds.Contains(row.Id))
            .Select(row => new IncidentModerationSummary(row.Id, row.Category, row.Description, row.Address,
                row.ClosedAt == null && row.LastConfirmedAt > now - Duration.FromHours(2) && row.CreatedAt > now - Duration.FromHours(12)))
            .ToListAsync(cancellationToken);

    public static async Task<bool> CloseByModeratorAsync(
        HappengoDbContext db,
        Guid incidentId,
        Guid moderatorId,
        Instant closedAt,
        CancellationToken cancellationToken)
    {
        var incident = await db.Incidents.FirstOrDefaultAsync(row => row.Id == incidentId, cancellationToken);
        if (incident is null || !IncidentActivity.IsActive(incident.CreatedAt, incident.LastConfirmedAt, incident.ClosedAt, closedAt)) return false;
        incident.ClosedAt = closedAt;
        incident.ClosedBy = moderatorId;
        incident.CloseReason = "moderator";
        return true;
    }
}
