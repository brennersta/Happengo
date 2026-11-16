using System.Text.Json.Serialization;

namespace Happengo.Api.Events;

public enum EventVisibility
{
    [JsonStringEnumMemberName("public")]
    Public,

    [JsonStringEnumMemberName("unlisted")]
    Unlisted,

    [JsonStringEnumMemberName("friends_only")]
    FriendsOnly,
}
