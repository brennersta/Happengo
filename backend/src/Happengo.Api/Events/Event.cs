using NetTopologySuite.Geometries;
using NodaTime;

namespace Happengo.Api.Events;

/// <summary>
/// An event has no stored status. Happening now and ended are computed from the clock (ADR 0003).
/// </summary>
internal sealed class Event
{
    public Guid Id { get; set; }

    public Guid OwnerId { get; set; }

    public string Title { get; set; } = "";

    public string? Description { get; set; }

    public Instant StartAt { get; set; }

    public Instant EndAt { get; set; }

    public string TimeZoneId { get; set; } = "";

    public Point Location { get; set; } = null!;

    public string Address { get; set; } = "";

    public EventVisibility Visibility { get; set; }

    /// <summary>
    /// SHA-256 of the canonical base64url share token. The plaintext is not stored.
    /// </summary>
    public byte[] ShareTokenHash { get; set; } = [];

    public ApprovalMode ApprovalMode { get; set; }

    public string? CoverBlobName { get; set; }

    public List<EventTag> Tags { get; set; } = [];

    public Instant CreatedAt { get; set; }

    public Instant UpdatedAt { get; set; }
}
