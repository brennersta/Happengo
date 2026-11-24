using Happengo.Api.Attendance;
using Happengo.Api.Friends;
using Happengo.Api.Infrastructure.Auth;
using Happengo.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Happengo.Api.Events;

internal enum EventReadScope
{
    Map,
    Direct,
}

internal static class EventQueries
{
    public const int MapResultLimit = 500;

    /// <summary>
    /// One visibility filter (ADR 0007).
    /// Map scope drops unlisted and cancelled events for every caller, including the owner,
    /// and drops every ended event (<c>end_at &lt;= now</c>), including the owner's
    /// and attendees' (ADR 0006). Direct reads still return ended and cancelled events under the same allow-list.
    /// The owner clause is the positive <see cref="OwnerVisibility"/> allow-list.
    /// </summary>
    public static IQueryable<Event> VisibleTo(
        this IQueryable<Event> events,
        HappengoDbContext db,
        Viewer viewer,
        Instant now,
        EventReadScope scope)
    {
        var userId = viewer.UserId ?? Guid.Empty;
        var known = viewer.IsAuthenticated;
        var map = scope == EventReadScope.Map;
        var ownerMaySee = map ? OwnerVisibility.OnMap : OwnerVisibility.ById;
        var attendingEventIds = AttendanceAccess.EventIdsAttendedBy(db, userId);
        var links = FriendAccess.Links(db);
        var ownedTags = FriendAccess.Tags(db);

        return events.Where(e =>
            !map || (e.EndAt > now && e.CancelledAt == null)).Where(e =>
            (known
                && e.OwnerId == userId
                && ownerMaySee.Contains(e.Visibility))
            || (known
                && e.EndAt <= now
                && !map
                && attendingEventIds.Contains(e.Id))
            || (e.Visibility == EventVisibility.Public && e.EndAt > now)
            || (e.Visibility == EventVisibility.FriendsOnly
                && e.EndAt > now
                && known
                && links.Any(link =>
                    (link.UserLowId == e.OwnerId && link.UserHighId == userId)
                    || (link.UserHighId == e.OwnerId && link.UserLowId == userId))
                && (!db.EventInvitedFriendTags.Any(tag => tag.EventId == e.Id)
                    || ownedTags.Any(tag =>
                        tag.OwnerId == e.OwnerId
                        && tag.FriendUserId == userId
                        && db.EventInvitedFriendTags.Any(invited =>
                            invited.EventId == e.Id && invited.NormalizedTag == tag.NormalizedTag)))));
    }

    /// <summary>
    /// Share-token path beside <see cref="VisibleTo"/> (ADR 0007). A token reads a live unlisted event only.
    /// </summary>
    public static IQueryable<Event> VisibleByShareToken(
        this IQueryable<Event> events,
        string token,
        Instant now)
    {
        // Lookup is the hash only. The plaintext column is not stored.
        var hash = ShareToken.Hash(token);
        return events.Where(e =>
            e.Visibility == EventVisibility.Unlisted
            && e.CancelledAt == null
            && e.ShareTokenHash == hash
            && e.EndAt > now);
    }

    public static IQueryable<Event> InBoundingBox(this DbSet<Event> events, BoundingBox box)
    {
        var minLng = box.MinLongitude;
        var minLat = box.MinLatitude;
        var maxLng = box.MaxLongitude;
        var maxLat = box.MaxLatitude;

        return events.FromSqlInterpolated($"""
            SELECT *
            FROM events
            WHERE location && ST_MakeEnvelope({minLng}, {minLat}, {maxLng}, {maxLat}, 4326)
            """);
    }

    public static IOrderedQueryable<Event> OrderForDiscovery(this IQueryable<Event> events, Instant now) =>
        events.OrderBy(e => e.StartAt > now)
            .ThenBy(e => e.StartAt)
            .ThenBy(e => e.Id);
}
