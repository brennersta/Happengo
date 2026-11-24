using NetTopologySuite.Geometries;
using NodaTime;
using System.Text.Json.Serialization;

namespace Happengo.Api.Incidents;

internal sealed class Incident
{
    public Guid Id { get; set; }
    public Guid ReporterId { get; set; }
    public IncidentCategory Category { get; set; }
    public string Description { get; set; } = "";
    public Point Location { get; set; } = null!;
    public string Address { get; set; } = "";
    public Instant CreatedAt { get; set; }
    public Instant LastConfirmedAt { get; set; }
    public Instant? ClosedAt { get; set; }
    public Guid? ClosedBy { get; set; }
    public string? CloseReason { get; set; }
}

internal sealed class IncidentVote
{
    public Guid IncidentId { get; set; }
    public Guid UserId { get; set; }
    public IncidentVoteValue Vote { get; set; }
    public Instant UpdatedAt { get; set; }
}

public enum IncidentCategory
{
    [JsonStringEnumMemberName("fire")] Fire,
    [JsonStringEnumMemberName("traffic_collision")] TrafficCollision,
    [JsonStringEnumMemberName("other")] Other,
}

public enum IncidentVoteValue
{
    [JsonStringEnumMemberName("still_there")] StillThere,
    [JsonStringEnumMemberName("gone")] Gone,
}
