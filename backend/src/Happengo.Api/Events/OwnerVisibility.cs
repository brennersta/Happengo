namespace Happengo.Api.Events;

/// <summary>
/// Positive allow-list for the owner clause of <c>VisibleTo</c>.
/// A visibility that is not listed stays hidden until someone opts it in,
/// including a member added to <see cref="EventVisibility"/> later.
/// Unlisted is direct-only: never a map row, even for the owner (ADR 0007).
/// Map scope also requires <c>end_at &gt; now</c> for every caller.
/// </summary>
internal static class OwnerVisibility
{
    public static readonly EventVisibility[] OnMap =
    [
        EventVisibility.Public,
        EventVisibility.FriendsOnly,
    ];

    public static readonly EventVisibility[] ById =
    [
        EventVisibility.Public,
        EventVisibility.Unlisted,
        EventVisibility.FriendsOnly,
    ];
}
