using NodaTime;

namespace Happengo.Api.Events;

/// <summary>
/// Stored per-user grant. Friends-only reads do not use this row; they use VisibleTo (ADR 0011).
/// </summary>
internal sealed class EventInvite
{
    public Guid Id { get; set; }

    public Guid EventId { get; set; }

    public Guid InviteeUserId { get; set; }

    public Instant CreatedAt { get; set; }
}
