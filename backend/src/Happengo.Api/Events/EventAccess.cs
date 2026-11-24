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
    Instant? CancelledAt,
    bool IsInvited,
    bool ShareTokenMatches);

public static class EventAccess
{
    public static Task<bool> ExistsAsync(
        HappengoDbContext db,
        Guid eventId,
        CancellationToken cancellationToken) =>
        db.Events.AsNoTracking().AnyAsync(e => e.Id == eventId, cancellationToken);

    public static Task<bool> IsVisibleAsync(
        HappengoDbContext db,
        Guid eventId,
        Guid userId,
        NodaTime.Instant now,
        CancellationToken cancellationToken) =>
        db.Events.AsNoTracking()
            .VisibleTo(db, new Happengo.Api.Infrastructure.Auth.Viewer(userId), now, EventReadScope.Direct)
            .AnyAsync(row => row.Id == eventId, cancellationToken);

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
        CancellationToken cancellationToken)
    {
        // Compare the hash only. The plaintext share token is not stored (PR #11).
        byte[]? tokenHash = null;
        if (!string.IsNullOrEmpty(shareToken) && ShareToken.TryCanonicalize(shareToken, out var canonical))
        {
            tokenHash = ShareToken.Hash(canonical);
        }

        var compareHash = tokenHash is not null;
        var hash = tokenHash ?? [];
        return db.Events.AsNoTracking()
            .Where(e => e.Id == eventId)
            .Select(e => new EventAttendanceContext(
                e.OwnerId,
                e.Visibility,
                e.ApprovalMode,
                e.EndAt,
                e.CancelledAt,
                db.EventInvites.Any(invite => invite.EventId == e.Id && invite.InviteeUserId == userId),
                compareHash && e.ShareTokenHash == hash))
            .FirstOrDefaultAsync(cancellationToken);
    }
}
