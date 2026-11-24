using System.Text.Json.Serialization;
using Happengo.Api.Friends;
using Happengo.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Happengo.Api.Events;

public sealed record EventResponse(
    Guid Id,
    string Title,
    string? Description,
    DateTimeOffset StartAt,
    DateTimeOffset EndAt,
    string TimeZoneId,
    string Address,
    IReadOnlyList<EventTag> Tags,
    EventVisibility Visibility,
    ApprovalMode ApprovalMode,
    bool HappeningNow,
    bool IsOwner,
    int AttendingCount,
    double Longitude,
    double Latitude,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    string? ShareToken,
    IReadOnlyList<string>? InvitedFriendTags,
    DateTimeOffset? CancelledAt,
    FriendsGoingResponse? FriendsGoing);

public sealed record EventMapResponse(
    IReadOnlyList<EventResponse> Items,
    int Limit,
    bool Truncated);

public sealed record FriendsGoingResponse(int Count, IReadOnlyList<string> Names);

internal static class EventMapping
{
    public static EventResponse ToResponse(
        this Event e,
        Guid? viewerId,
        NodaTime.Instant now,
        int attendingCount,
        IReadOnlyList<string>? invitedFriendTags = null,
        FriendsGoingResponse? friendsGoing = null) =>
        new(
            e.Id,
            e.Title,
            e.Description,
            e.StartAt.ToDateTimeOffset(),
            e.EndAt.ToDateTimeOffset(),
            e.TimeZoneId,
            e.Address,
            e.Tags,
            e.Visibility,
            e.ApprovalMode,
            HappeningNow: e.CancelledAt is null && e.StartAt <= now && now < e.EndAt,
            IsOwner: viewerId is not null && e.OwnerId == viewerId,
            attendingCount,
            Longitude: e.Location.X,
            Latitude: e.Location.Y,
            // Only the SHA-256 is stored, so event reads never echo the plaintext token.
            ShareToken: null,
            // Null for everyone except the owner, so the tags are not omitted from the contract
            // and are still absent as values for other readers.
            InvitedFriendTags: viewerId is not null && e.OwnerId == viewerId ? invitedFriendTags ?? [] : null,
            CancelledAt: e.CancelledAt?.ToDateTimeOffset(),
            FriendsGoing: friendsGoing);

    public static async Task<EventResponse[]> ToResponsesAsync(
        this IReadOnlyList<Event> events,
        HappengoDbContext db,
        Guid? viewerId,
        NodaTime.Instant now,
        IReadOnlyDictionary<Guid, int> counts,
        CancellationToken cancellationToken)
    {
        var ownedIds = events
            .Where(e => viewerId is not null && e.OwnerId == viewerId)
            .Select(e => e.Id)
            .ToArray();
        var labels = new Dictionary<Guid, string[]>();
        if (ownedIds.Length > 0)
        {
            var rows = await db.EventInvitedFriendTags.AsNoTracking()
                .Where(tag => ownedIds.Contains(tag.EventId))
                .OrderBy(tag => tag.Label)
                .ToListAsync(cancellationToken);
            labels = rows
                .GroupBy(tag => tag.EventId)
                .ToDictionary(group => group.Key, group => group.Select(tag => tag.Label).ToArray());
        }

        var friendsGoing = new Dictionary<Guid, FriendsGoingResponse>();
        if (viewerId is Guid currentViewerId && events.Count > 0)
        {
            var entries = await FriendAccess.GoingToEventsAsync(
                db,
                currentViewerId,
                events.Select(e => e.Id).ToArray(),
                cancellationToken);
            friendsGoing = entries
                .GroupBy(entry => entry.EventId)
                .ToDictionary(
                    group => group.Key,
                    group => new FriendsGoingResponse(
                        group.Count(),
                        group.Select(entry => entry.DisplayName)
                            .Where(name => !string.IsNullOrWhiteSpace(name))
                            .Take(3)
                            .Select(name => name!)
                            .ToArray()));
        }

        return events
            .Select(e => e.ToResponse(
                viewerId,
                now,
                counts.GetValueOrDefault(e.Id),
                viewerId is not null && e.OwnerId == viewerId
                    ? labels.GetValueOrDefault(e.Id) ?? []
                    : null,
                viewerId is null
                    ? null
                    : friendsGoing.GetValueOrDefault(e.Id) ?? new FriendsGoingResponse(0, [])))
            .ToArray();
    }
}
