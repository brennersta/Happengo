namespace Happengo.Api.Friends;

/// <summary>A tag the owner applied to one friend. Other people, including that friend, never receive it.</summary>
internal sealed class FriendTag
{
    public Guid Id { get; set; }

    public Guid OwnerId { get; set; }

    public Guid FriendUserId { get; set; }

    public string NormalizedTag { get; set; } = "";

    public string Label { get; set; } = "";
}
