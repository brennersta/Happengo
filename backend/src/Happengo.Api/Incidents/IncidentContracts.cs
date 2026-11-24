using NetTopologySuite.Geometries;
using NodaTime;
using System.Text.Json.Serialization;

namespace Happengo.Api.Incidents;

public sealed record CreateIncidentRequest(
    [property: JsonRequired] IncidentCategory Category,
    [property: JsonRequired] string Description,
    [property: JsonRequired] double Longitude,
    [property: JsonRequired] double Latitude,
    [property: JsonRequired] string Address);
public sealed record VoteIncidentRequest([property: JsonRequired] IncidentVoteValue Vote);
public sealed record IncidentResponse(Guid Id, IncidentCategory Category, string Description, double Longitude, double Latitude,
    string Address, DateTimeOffset CreatedAt, DateTimeOffset LastConfirmedAt, DateTimeOffset? ClosedAt, string? CloseReason, bool IsActive,
    int StillThereCount, int GoneCount, IncidentVoteValue? MyVote, bool IsReporter);
public sealed record IncidentsResponse(IReadOnlyList<IncidentResponse> Items);

internal static class IncidentMapping
{
    public static IncidentResponse ToResponse(this Incident incident, Guid? viewerId, int stillThere, int gone, IncidentVoteValue? myVote, Instant now) =>
        new(incident.Id, incident.Category, incident.Description, incident.Location.X, incident.Location.Y,
            incident.Address, incident.CreatedAt.ToDateTimeOffset(), incident.LastConfirmedAt.ToDateTimeOffset(), incident.ClosedAt?.ToDateTimeOffset(), incident.CloseReason,
            IncidentActivity.IsActive(incident.CreatedAt, incident.LastConfirmedAt, incident.ClosedAt, now),
            stillThere, gone, myVote, viewerId == incident.ReporterId);
}
