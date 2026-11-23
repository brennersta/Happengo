using NodaTime;

namespace Happengo.Api.Events.CreateEvent;

internal sealed record ValidatedCreateEvent(
    string Title,
    string? Description,
    Instant StartAt,
    Instant EndAt,
    string TimeZoneId,
    string Address,
    double Longitude,
    double Latitude,
    EventVisibility Visibility,
    ApprovalMode ApprovalMode,
    List<EventTag> Tags);

internal static class CreateEventValidator
{
    private static readonly Duration MaximumDuration = Duration.FromDays(7);

    public static bool TryValidate(
        CreateEventRequest request,
        Instant now,
        out ValidatedCreateEvent? value,
        out string detail)
    {
        value = null;
        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Trim().Length > 200)
        {
            detail = "Title is required and must be at most 200 characters.";
            return false;
        }

        if (request.Description?.Length > 4000)
        {
            detail = "Description must be at most 4000 characters.";
            return false;
        }

        if (request.StartAt is not DateTimeOffset requestedStartAt)
        {
            detail = "StartAt is required.";
            return false;
        }

        if (request.EndAt is not DateTimeOffset requestedEndAt)
        {
            detail = "EndAt is required.";
            return false;
        }

        var startAt = Instant.FromDateTimeOffset(requestedStartAt);
        var endAt = Instant.FromDateTimeOffset(requestedEndAt);
        if (startAt < now)
        {
            detail = "StartAt cannot be in the past.";
            return false;
        }

        if (endAt <= now)
        {
            detail = "EndAt must be in the future.";
            return false;
        }

        if (endAt <= startAt)
        {
            detail = "EndAt must be after StartAt.";
            return false;
        }

        if (endAt - startAt > MaximumDuration)
        {
            detail = "Event duration cannot exceed 7 days.";
            return false;
        }

        var zoneId = request.TimeZoneId?.Trim();
        if (string.IsNullOrEmpty(zoneId) || DateTimeZoneProviders.Tzdb.GetZoneOrNull(zoneId) is null)
        {
            detail = "TimeZoneId must be a valid IANA time-zone identifier.";
            return false;
        }

        if (string.IsNullOrWhiteSpace(request.Address) || request.Address.Trim().Length > 500)
        {
            detail = "Address is required and must be at most 500 characters.";
            return false;
        }

        if (request.Longitude is not double requestedLongitude)
        {
            detail = "Longitude is required.";
            return false;
        }

        if (request.Latitude is not double requestedLatitude)
        {
            detail = "Latitude is required.";
            return false;
        }

        var longitude = requestedLongitude;
        if (!double.IsFinite(longitude) || longitude is < -180 or > 180)
        {
            detail = "Longitude must be a finite number between -180 and 180.";
            return false;
        }

        var latitude = requestedLatitude;
        if (!double.IsFinite(latitude) || latitude is < -90 or > 90)
        {
            detail = "Latitude must be a finite number between -90 and 90.";
            return false;
        }

        if (request.Visibility is not EventVisibility visibility || !Enum.IsDefined(visibility))
        {
            detail = "Visibility is required and must use a supported value.";
            return false;
        }

        if (request.ApprovalMode is not ApprovalMode approvalMode || !Enum.IsDefined(approvalMode))
        {
            detail = "ApprovalMode is required and must use a supported value.";
            return false;
        }

        var tags = request.Tags?.Distinct().ToList() ?? [];
        if (tags.Count == 0)
        {
            detail = "At least one event tag is required; the first tag is the main type.";
            return false;
        }
        if (tags.Count > Enum.GetValues<EventTag>().Length || tags.Any(tag => !Enum.IsDefined(tag)))
        {
            detail = "Tags must use the supported event tag vocabulary.";
            return false;
        }

        value = new ValidatedCreateEvent(
            request.Title.Trim(),
            string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            startAt,
            endAt,
            zoneId,
            request.Address.Trim(),
            longitude,
            latitude,
            visibility,
            approvalMode,
            tags);
        detail = "";
        return true;
    }
}
