using System.Text.Json.Serialization;

namespace Happengo.Api.Attendance;

public enum AttendanceStatus
{
    [JsonStringEnumMemberName("attending")]
    Attending,

    [JsonStringEnumMemberName("requested")]
    Requested,

    [JsonStringEnumMemberName("rejected")]
    Rejected,

    [JsonStringEnumMemberName("cancelled")]
    Cancelled,
}
