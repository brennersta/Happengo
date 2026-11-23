using System.Text.Json.Serialization;

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
    string? ShareToken);

public sealed record EventMapResponse(
    IReadOnlyList<EventResponse> Items,
    int Limit,
    bool Truncated);

internal static class EventMapping
{
    public static EventResponse ToResponse(
        this Event e,
        Guid? viewerId,
        NodaTime.Instant now,
        int attendingCount,
        bool includeShareToken) =>
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
            HappeningNow: e.StartAt <= now && now <= e.EndAt,
            IsOwner: viewerId is not null && e.OwnerId == viewerId,
            attendingCount,
            Longitude: e.Location.X,
            Latitude: e.Location.Y,
            ShareToken: includeShareToken && viewerId is not null && e.OwnerId == viewerId
                ? e.ShareToken
                : null);
}
