using System.Text.Json.Serialization;

namespace Happengo.Api.Events;

public enum ApprovalMode
{
    [JsonStringEnumMemberName("open")]
    Open,

    [JsonStringEnumMemberName("approval")]
    Approval,
}
