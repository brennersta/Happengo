using Happengo.Api.Events;
using Happengo.Api.Events.CreateEvent;
using NodaTime;

namespace Happengo.Api.Tests.Events;

public sealed class CreateEventValidatorTests
{
    private static readonly Instant Now = Instant.FromUtc(2026, 11, 17, 10, 0);

    [Fact]
    public void Valid_request_is_normalized_and_keeps_supported_values()
    {
        var request = Request();

        var valid = CreateEventValidator.TryValidate(request, Now, out var value, out var detail);

        Assert.True(valid, detail);
        Assert.NotNull(value);
        Assert.Equal("Dinner", value.Title);
        Assert.Equal(EventVisibility.Public, value.Visibility);
        Assert.Equal(ApprovalMode.Open, value.ApprovalMode);
        Assert.Equal([EventTag.Food, EventTag.Family], value.Tags);
    }

    [Fact]
    public void Start_in_the_past_is_rejected_even_when_the_event_is_still_live()
    {
        var request = Request() with { StartAt = Now.ToDateTimeOffset().AddTicks(-1) };
        AssertInvalid(request, "StartAt cannot be in the past.");
    }

    [Fact]
    public void End_at_or_before_now_is_rejected()
    {
        var request = Request() with { EndAt = Now.ToDateTimeOffset() };
        AssertInvalid(request, "EndAt must be in the future.");
    }

    [Fact]
    public void Duration_over_seven_days_is_rejected()
    {
        var request = Request() with { EndAt = Now.ToDateTimeOffset().AddDays(7).AddTicks(1) };
        AssertInvalid(request, "Event duration cannot exceed 7 days.");
    }

    [Fact]
    public void Tag_order_survives_duplicate_removal_and_empty_tags_are_rejected()
    {
        var request = Request() with
        {
            Tags = [EventTag.Nightlife, EventTag.Food, EventTag.Nightlife, EventTag.Music],
        };
        var valid = CreateEventValidator.TryValidate(request, Now, out var value, out var detail);
        Assert.True(valid, detail);
        Assert.Equal([EventTag.Nightlife, EventTag.Food, EventTag.Music], value!.Tags);
        Assert.Equal(EventTag.Nightlife, value.Tags[0]);

        AssertInvalid(Request() with { Tags = [] }, "At least one event tag is required; the first tag is the main type.");
        AssertInvalid(Request() with { Tags = null }, "At least one event tag is required; the first tag is the main type.");
    }

    [Fact]
    public void Invalid_coordinates_and_time_zones_are_rejected()
    {
        AssertInvalid(Request() with { Longitude = 181 }, "Longitude must be a finite number between -180 and 180.");
        AssertInvalid(Request() with { Latitude = double.NaN }, "Latitude must be a finite number between -90 and 90.");
        AssertInvalid(Request() with { TimeZoneId = "Not/AZone" }, "TimeZoneId must be a valid IANA time-zone identifier.");
    }

    private static CreateEventRequest Request() => new()
    {
        Title = " Dinner ",
        Description = "With family",
        StartAt = Now.ToDateTimeOffset(),
        EndAt = Now.ToDateTimeOffset().AddHours(2),
        TimeZoneId = "Europe/Tallinn",
        Address = "Tallinn",
        Longitude = 24.7536,
        Latitude = 59.437,
        Visibility = EventVisibility.Public,
        ApprovalMode = ApprovalMode.Open,
        Tags = [EventTag.Food, EventTag.Family, EventTag.Food],
    };

    private static void AssertInvalid(CreateEventRequest request, string expectedDetail)
    {
        Assert.False(CreateEventValidator.TryValidate(request, Now, out var value, out var detail));
        Assert.Null(value);
        Assert.Equal(expectedDetail, detail);
    }
}
