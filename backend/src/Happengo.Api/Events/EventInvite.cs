using NodaTime;

namespace Happengo.Api.Events;

/// <summary>
/// Friends-only grant. A friendship row alone does not grant access (ADR 0007).
/// </summary>
internal sealed class EventInvite
{
    public Guid Id { get; set; }

    public Guid EventId { get; set; }

    public Guid InviteeUserId { get; set; }

    public Instant CreatedAt { get; set; }
}
