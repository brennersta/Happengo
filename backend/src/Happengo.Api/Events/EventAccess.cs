using Happengo.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Happengo.Api.Events;

/// <summary>Public cross-feature contract for deciding who may request attendance.</summary>
public sealed record EventAttendanceContext(
    Guid OwnerId,
    EventVisibility Visibility,
    ApprovalMode ApprovalMode,
    Instant EndAt,
    bool IsInvited,
    bool ShareTokenMatches);

public static class EventAccess
{
    public static Task<bool> ExistsAsync(
        HappengoDbContext db,
        Guid eventId,
        CancellationToken cancellationToken) =>
        db.Events.AsNoTracking().AnyAsync(e => e.Id == eventId, cancellationToken);

    public static Task<bool> IsOwnerAsync(
        HappengoDbContext db,
        Guid eventId,
        Guid userId,
        CancellationToken cancellationToken) =>
        db.Events.AsNoTracking().AnyAsync(e => e.Id == eventId && e.OwnerId == userId, cancellationToken);

    public static Task<EventAttendanceContext?> FindAttendanceContextAsync(
        HappengoDbContext db,
        Guid eventId,
        Guid userId,
        string? shareToken,
        CancellationToken cancellationToken) =>
        db.Events.AsNoTracking()
            .Where(e => e.Id == eventId)
            .Select(e => new EventAttendanceContext(
                e.OwnerId,
                e.Visibility,
                e.ApprovalMode,
                e.EndAt,
                db.EventInvites.Any(invite => invite.EventId == e.Id && invite.InviteeUserId == userId),
                e.ShareToken == shareToken))
            .FirstOrDefaultAsync(cancellationToken);
}
