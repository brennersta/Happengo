using Happengo.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Happengo.Api.Attendance;

/// <summary>
/// Public contract other features use. The attendance entity stays internal to this feature.
/// </summary>
public static class AttendanceAccess
{
    public static async Task<AttendanceStatus?> GetStatusAsync(
        HappengoDbContext db,
        Guid eventId,
        Guid userId,
        CancellationToken cancellationToken) =>
        await db.Attendances.AsNoTracking()
            .Where(row => row.EventId == eventId && row.UserId == userId)
            .Select(row => (AttendanceStatus?)row.Status)
            .FirstOrDefaultAsync(cancellationToken);

    public static async Task<AttendanceMutationResult> RequestAsync(
        HappengoDbContext db,
        Guid eventId,
        Guid userId,
        AttendanceStatus requestedStatus,
        Instant now,
        CancellationToken cancellationToken)
    {
        var existing = await db.Attendances
            .FirstOrDefaultAsync(row => row.EventId == eventId && row.UserId == userId, cancellationToken);
        if (existing is not null)
        {
            return existing.Status is AttendanceStatus.Requested or AttendanceStatus.Attending
                ? new AttendanceMutationResult(true, existing.Status)
                : new AttendanceMutationResult(false, existing.Status);
        }

        Add(db, eventId, userId, requestedStatus, now);
        await db.SaveChangesAsync(cancellationToken);
        return new AttendanceMutationResult(true, requestedStatus);
    }

    public static async Task<AttendanceMutationResult> TransitionAsync(
        HappengoDbContext db,
        Guid eventId,
        Guid userId,
        AttendanceStatus expectedStatus,
        AttendanceStatus nextStatus,
        CancellationToken cancellationToken)
    {
        var row = await db.Attendances
            .FirstOrDefaultAsync(item => item.EventId == eventId && item.UserId == userId, cancellationToken);
        if (row is null)
        {
            return new AttendanceMutationResult(false, null);
        }

        if (row.Status == nextStatus)
        {
            return new AttendanceMutationResult(true, row.Status);
        }

        if (row.Status != expectedStatus)
        {
            return new AttendanceMutationResult(false, row.Status);
        }

        row.Status = nextStatus;
        await db.SaveChangesAsync(cancellationToken);
        return new AttendanceMutationResult(true, nextStatus);
    }

    public static Task<List<Guid>> PendingUserIdsAsync(
        HappengoDbContext db,
        Guid eventId,
        CancellationToken cancellationToken) =>
        db.Attendances.AsNoTracking()
            .Where(row => row.EventId == eventId && row.Status == AttendanceStatus.Requested)
            .OrderBy(row => row.CreatedAt)
            .Select(row => row.UserId)
            .ToListAsync(cancellationToken);

    public static Task<int> AttendingCountAsync(
        HappengoDbContext db,
        Guid eventId,
        CancellationToken cancellationToken) =>
        db.Attendances.AsNoTracking()
            .CountAsync(row => row.EventId == eventId && row.Status == AttendanceStatus.Attending, cancellationToken);

    public static void Add(HappengoDbContext db, Guid eventId, Guid userId, AttendanceStatus status, Instant now) =>
        db.Attendances.Add(new Attendance
        {
            Id = Guid.CreateVersion7(),
            EventId = eventId,
            UserId = userId,
            Status = status,
            CreatedAt = now,
        });

    public static void AddOwnerAttending(HappengoDbContext db, Guid eventId, Guid userId, Instant now) =>
        Add(db, eventId, userId, AttendanceStatus.Attending, now);

    public static IQueryable<Guid> EventIdsAttendedBy(HappengoDbContext db, Guid userId) =>
        db.Attendances
            .Where(row => row.UserId == userId && row.Status == AttendanceStatus.Attending)
            .Select(row => row.EventId);

    public static IQueryable<Guid> EventIdsForMyEvents(HappengoDbContext db, Guid userId) =>
        db.Attendances
            .Where(row => row.UserId == userId
                && (row.Status == AttendanceStatus.Attending || row.Status == AttendanceStatus.Requested))
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

public sealed record AttendanceMutationResult(bool Succeeded, AttendanceStatus? Status);
