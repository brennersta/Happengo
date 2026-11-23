using System.Net;
using Happengo.Api.Events;
using Happengo.Api.Events.CreateEvent;
using Happengo.Api.Events.EditEvent;
using Happengo.Api.Infrastructure;
using Happengo.Api.Tests.Support;

namespace Happengo.Api.Tests.Events;

public sealed class EditEventTests(ApiFactory factory) : IntegrationTest
{
    [Fact]
    public async Task Owner_can_edit_fields_and_tag_order_without_changing_visibility_or_approval_mode()
    {
        await factory.ResetAsync();
        var client = factory.CreateClient();
        var created = await CreateAsync(client, "owner");
        var request = EditRequest() with
        {
            Title = "Updated gathering",
            Description = "New details",
            Address = "Updated address",
            Longitude = 24.81,
            Latitude = 59.46,
            Tags = [EventTag.Nightlife, EventTag.Food, EventTag.Music],
            InvitedFriendTags = ["Close Friends", "Family"],
        };

        var response = await client.SendAsync(ApiJson.Patch($"/v1/events/{created.Id}", request, "owner"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.Read<EventResponse>();
        Assert.NotNull(updated);
        Assert.Equal("Updated gathering", updated.Title);
        Assert.Equal("New details", updated.Description);
        Assert.Equal("Updated address", updated.Address);
        Assert.Equal(24.81, updated.Longitude);
        Assert.Equal(59.46, updated.Latitude);
        Assert.Equal([EventTag.Nightlife, EventTag.Food, EventTag.Music], updated.Tags);
        Assert.Equal(EventVisibility.FriendsOnly, updated.Visibility);
        Assert.Equal(ApprovalMode.Approval, updated.ApprovalMode);
        Assert.Equal(["Close Friends", "Family"], updated.InvitedFriendTags);

        var read = await client.SendAsync(ApiJson.Get($"/v1/events/{created.Id}", "owner"));
        var stored = await read.Content.Read<EventResponse>();
        Assert.Equal(updated.Tags, stored!.Tags);
        Assert.Equal(updated.StartAt, stored.StartAt);
        Assert.Equal(updated.EndAt, stored.EndAt);
        Assert.Equal(updated.TimeZoneId, stored.TimeZoneId);
    }

    [Fact]
    public async Task Non_owner_gets_404_and_anonymous_gets_401_problem_details()
    {
        await factory.ResetAsync();
        var client = factory.CreateClient();
        var created = await CreateAsync(client, "owner");

        var nonOwner = await client.SendAsync(ApiJson.Patch($"/v1/events/{created.Id}", EditRequest(), "stranger"));
        Assert.Equal(HttpStatusCode.NotFound, nonOwner.StatusCode);
        Assert.Equal(ProblemTypes.NotFound, (await nonOwner.Content.Read<Microsoft.AspNetCore.Mvc.ProblemDetails>())!.Type);

        var anonymous = await client.SendAsync(ApiJson.Patch($"/v1/events/{created.Id}", EditRequest()));
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        Assert.Equal(ProblemTypes.Unauthorized, (await anonymous.Content.Read<Microsoft.AspNetCore.Mvc.ProblemDetails>())!.Type);
    }

    [Fact]
    public async Task Owner_cannot_edit_an_event_that_has_ended()
    {
        await factory.ResetAsync();
        var client = factory.CreateClient();
        var created = await CreateAsync(client, "owner");
        factory.Clock.Set(TestData.Now + NodaTime.Duration.FromHours(3));

        var response = await client.SendAsync(ApiJson.Patch($"/v1/events/{created.Id}", EditRequest(), "owner"));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Contains("problem+json", response.Content.Headers.ContentType?.MediaType, StringComparison.Ordinal);
        Assert.Equal(ProblemTypes.EventConflict, (await response.Content.Read<Microsoft.AspNetCore.Mvc.ProblemDetails>())!.Type);
    }

    [Fact]
    public async Task Edit_reuses_create_validation_including_the_seven_day_maximum()
    {
        await factory.ResetAsync();
        var client = factory.CreateClient();
        var created = await CreateAsync(client, "owner");
        var invalid = EditRequest() with
        {
            StartAt = TestData.Now.ToDateTimeOffset().AddHours(1),
            EndAt = TestData.Now.ToDateTimeOffset().AddDays(8),
        };

        var response = await client.SendAsync(ApiJson.Patch($"/v1/events/{created.Id}", invalid, "owner"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(ProblemTypes.InvalidEvent, (await response.Content.Read<Microsoft.AspNetCore.Mvc.ProblemDetails>())!.Type);
    }

    private static async Task<EventResponse> CreateAsync(HttpClient client, string owner)
    {
        var create = new CreateEventRequest
        {
            Title = "Original gathering",
            Description = "Original details",
            StartAt = TestData.Now.ToDateTimeOffset().AddHours(1),
            EndAt = TestData.Now.ToDateTimeOffset().AddHours(3),
            TimeZoneId = "Europe/Tallinn",
            Address = "Tallinn",
            Longitude = TestData.InsideLng,
            Latitude = TestData.InsideLat,
            Visibility = EventVisibility.FriendsOnly,
            ApprovalMode = ApprovalMode.Approval,
            Tags = [EventTag.Food, EventTag.Music],
            InvitedFriendTags = ["Family"],
        };
        var response = await client.SendAsync(ApiJson.Post("/v1/events", create, owner));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.Read<EventResponse>())!;
    }

    private static EditEventRequest EditRequest() => new()
    {
        Title = "Updated gathering",
        Description = "New details",
        StartAt = TestData.Now.ToDateTimeOffset().AddHours(2),
        EndAt = TestData.Now.ToDateTimeOffset().AddHours(4),
        TimeZoneId = "Europe/Tallinn",
        Address = "Updated address",
        Longitude = 24.81,
        Latitude = 59.46,
        Tags = [EventTag.Nightlife, EventTag.Food],
        InvitedFriendTags = ["Close Friends", "Family"],
    };
}
