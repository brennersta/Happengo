using Happengo.Api.Attendance;
using Happengo.Api.Friends;
using Microsoft.EntityFrameworkCore;

namespace Happengo.Api.Infrastructure.Persistence;

/// <summary>
/// Executes the cross-feature friends-attendance read without exposing Attendance or User entities
/// across their feature boundaries. All joins stay over entity/scalar members until the final projection.
/// </summary>
internal static class FriendsGoingQuery
{
    public static Task<List<FriendGoingEntry>> FindAsync(
        HappengoDbContext db,
        Guid viewerId,
        IReadOnlyCollection<Guid> eventIds,
        CancellationToken cancellationToken) =>
        (
            from attendance in db.Attendances.AsNoTracking()
            join user in db.Users.AsNoTracking() on attendance.UserId equals user.Id
            where eventIds.Contains(attendance.EventId)
                && attendance.Status == AttendanceStatus.Attending
                && attendance.UserId != viewerId
                && db.Friendships.AsNoTracking().Any(friendship =>
                    (friendship.UserLowId == viewerId && friendship.UserHighId == attendance.UserId)
                    || (friendship.UserHighId == viewerId && friendship.UserLowId == attendance.UserId))
                && user.ShareAttendanceWithFriends
            orderby user.DisplayName, user.Id
            select new FriendGoingEntry(attendance.EventId, user.DisplayName))
            .ToListAsync(cancellationToken);
}
