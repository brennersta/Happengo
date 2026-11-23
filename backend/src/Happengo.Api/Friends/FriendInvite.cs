using NodaTime;

namespace Happengo.Api.Friends;

/// <summary>One active invite per user. The column is the SHA-256 of the token, never the token.</summary>
internal sealed class FriendInvite
{
    public Guid UserId { get; set; }

    public byte[] TokenHash { get; set; } = [];

    public Instant CreatedAt { get; set; }
}
