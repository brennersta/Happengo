namespace Happengo.Api.Attendance;

internal static class StoredAttendanceStatus
{
    public const string Check = "status IN ('attending', 'requested', 'rejected', 'cancelled')";

    public static string ToProvider(AttendanceStatus value) => value switch
    {
        AttendanceStatus.Attending => "attending",
        AttendanceStatus.Requested => "requested",
        AttendanceStatus.Rejected => "rejected",
        AttendanceStatus.Cancelled => "cancelled",
        _ => throw new InvalidOperationException($"Unknown attendance status '{value}'."),
    };

    public static AttendanceStatus FromProvider(string value) => value switch
    {
        "attending" => AttendanceStatus.Attending,
        "requested" => AttendanceStatus.Requested,
        "rejected" => AttendanceStatus.Rejected,
        "cancelled" => AttendanceStatus.Cancelled,
        _ => throw new InvalidOperationException($"Unknown stored attendance status '{value}'."),
    };
}
