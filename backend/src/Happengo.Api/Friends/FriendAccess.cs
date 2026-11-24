using Happengo.Api.Attendance;
using Happengo.Api.Identity;
using Happengo.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Happengo.Api.Friends;

/// <summary>
/// Public read model so other features can apply the friendship rule without using Friends entities.
/// </summary>
public sealed class FriendLink
{
    public Guid UserLowId { get; init; }

    public Guid UserHighId { get; init; }
}

public sealed class OwnedFriendTag
{
    public Guid OwnerId { get; init; }

    public Guid FriendUserId { get; init; }

    public string NormalizedTag { get; init; } = "";
}

public sealed record FriendGoingEntry(Guid EventId, string? DisplayName);

public static class FriendAccess
{
    public static Task<List<FriendGoingEntry>> GoingToEventsAsync(
        HappengoDbContext db,
        Guid viewerId,
        IReadOnlyCollection<Guid> eventIds,
        CancellationToken cancellationToken)
    {
        if (eventIds.Count == 0)
        {
            return Task.FromResult(new List<FriendGoingEntry>());
        }

        var attendees = AttendanceAccess.AttendingUsers(db, eventIds);
        var friendIds = FriendIdsOf(db, viewerId);
        var profiles = UserDirectory.AttendanceProfiles(db);

        return (
            from attendee in attendees
            join friendId in friendIds on attendee.UserId equals friendId
            join profile in profiles on attendee.UserId equals profile.UserId
            where attendee.UserId != viewerId && profile.ShareAttendanceWithFriends
            orderby profile.DisplayName, profile.UserId
            select new FriendGoingEntry(attendee.EventId, profile.DisplayName))
            .ToListAsync(cancellationToken);
    }

    public static IQueryable<FriendLink> Links(HappengoDbContext db) =>
        db.Friendships.Select(row => new FriendLink
        {
            UserLowId = row.UserLowId,
            UserHighId = row.UserHighId,
        });

    public static IQueryable<OwnedFriendTag> Tags(HappengoDbContext db) =>
        db.FriendTags.Select(row => new OwnedFriendTag
        {
            OwnerId = row.OwnerId,
            FriendUserId = row.FriendUserId,
            NormalizedTag = row.NormalizedTag,
        });

    public static IQueryable<Guid> FriendIdsOf(HappengoDbContext db, Guid userId) =>
        db.Friendships
            .Where(row => row.UserLowId == userId || row.UserHighId == userId)
            .Select(row => row.UserLowId == userId ? row.UserHighId : row.UserLowId);
}
