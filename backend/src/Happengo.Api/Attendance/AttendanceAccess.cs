using Happengo.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Happengo.Api.Attendance;

/// <summary>
/// Public contract other features use. The attendance entity stays internal to this feature.
/// </summary>
public static class AttendanceAccess
{
    public static IQueryable<Guid> EventIdsAttendedBy(HappengoDbContext db, Guid userId) =>
        db.Attendances
            .Where(row => row.UserId == userId && row.Status == AttendanceStatus.Attending)
            .Select(row => row.EventId);

    public static async Task<IReadOnlyDictionary<Guid, int>> AttendingCountsAsync(
        HappengoDbContext db,
        IReadOnlyCollection<Guid> eventIds,
        CancellationToken cancellationToken)
    {
        if (eventIds.Count == 0)
        {
            return new Dictionary<Guid, int>();
        }

        var rows = await db.Attendances
            .Where(row => eventIds.Contains(row.EventId) && row.Status == AttendanceStatus.Attending)
            .GroupBy(row => row.EventId)
            .Select(group => new { EventId = group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken);

        return rows.ToDictionary(row => row.EventId, row => row.Count);
    }
}
