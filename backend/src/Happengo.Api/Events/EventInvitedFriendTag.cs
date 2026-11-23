namespace Happengo.Api.Events;

/// <summary>
/// Tags the owner chose when creating a friends-only event. Returned only to the owner.
/// </summary>
internal sealed class EventInvitedFriendTag
{
    public Guid Id { get; set; }

    public Guid EventId { get; set; }

    public string NormalizedTag { get; set; } = "";

    public string Label { get; set; } = "";
}
