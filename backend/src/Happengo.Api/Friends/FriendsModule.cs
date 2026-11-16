namespace Happengo.Api.Friends;

/// <summary>
/// Mutual friendships and owner-private tags. Not in this slice.
/// Friends-only reads use <c>event_invites</c>, which a later public Events contract will write.
/// Do not reference Events internals from here.
/// </summary>
internal static class FriendsModule
{
}
