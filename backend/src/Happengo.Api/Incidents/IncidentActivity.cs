using NodaTime;

namespace Happengo.Api.Incidents;

internal static class IncidentActivity
{
    public static bool IsActive(Instant createdAt, Instant lastConfirmedAt, Instant? closedAt, Instant now) =>
        closedAt is null
        && now < lastConfirmedAt + Duration.FromHours(2)
        && now < createdAt + Duration.FromHours(12);
}
