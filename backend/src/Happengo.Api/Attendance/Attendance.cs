using NodaTime;

namespace Happengo.Api.Attendance;

/// <summary>
/// Attendance row. Event status is not stored here. <see cref="AttendanceStatus.Attending"/>
/// is what unlocks a past event (ADR 0007). Requested, rejected, and cancelled do not.
/// </summary>
internal sealed class Attendance
{
    public Guid Id { get; set; }

    public Guid EventId { get; set; }

    public Guid UserId { get; set; }

    public AttendanceStatus Status { get; set; }

    public Instant CreatedAt { get; set; }
}
