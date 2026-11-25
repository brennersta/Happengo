using Happengo.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Happengo.Api.Events;

/// <summary>Public contracts used by other features to inspect events and attendance rules.</summary>
public sealed record EventAttendanceContext(
    Guid OwnerId,
    EventVisibility Visibility,
    ApprovalMode ApprovalMode,
    Instant EndAt,
    Instant? CancelledAt,
    bool IsInvited,
    bool ShareTokenMatches);

public sealed record EventModerationSummary(Guid Id, string Title, string? Description, string Address, bool IsHidden);

public static class EventAccess
{
    public static Task<bool> IsReportableAsync(
        HappengoDbContext db,
        Guid eventId,
        Guid viewerId,
        Instant now,
        CancellationToken cancellationToken) =>
        db.Events.AsNoTracking()
            .VisibleTo(db, new Happengo.Api.Infrastructure.Auth.Viewer(viewerId), now, EventReadScope.Direct)
            .AnyAsync(row => row.Id == eventId && row.CancelledAt == null, cancellationToken);

    public static async Task<IReadOnlyList<EventModerationSummary>> GetModerationSummariesAsync(
        HappengoDbContext db,
        IReadOnlyCollection<Guid> eventIds,
        CancellationToken cancellationToken) =>
        await db.Events.AsNoTracking().Where(row => eventIds.Contains(row.Id))
            .Select(row => new EventModerationSummary(row.Id, row.Title, row.Description, row.Address, row.HiddenAt != null))
            .ToListAsync(cancellationToken);

    public static async Task<bool> HideAsync(
        HappengoDbContext db,
        Guid eventId,
        Instant hiddenAt,
        string reason,
        CancellationToken cancellationToken)
    {
        var row = await db.Events.FirstOrDefaultAsync(item => item.Id == eventId, cancellationToken);
        if (row is null || row.HiddenAt is not null) return false;
        row.HiddenAt = hiddenAt;
        row.HideReason = reason;
        return true;
    }

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
