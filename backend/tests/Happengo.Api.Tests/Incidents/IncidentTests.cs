using System.Net;
using Happengo.Api.Incidents;
using Happengo.Api.Tests.Support;
using Microsoft.AspNetCore.Mvc;
using NodaTime;

namespace Happengo.Api.Tests.Incidents;

public sealed class IncidentActivityTests
{
    private static readonly Instant Created = Instant.FromUtc(2026, 1, 1, 0, 0);

    [Fact]
    public void Active_window_expires_two_hours_after_last_confirmation()
    {
        Assert.True(IncidentActivity.IsActive(Created, Created, null, Created + Duration.FromHours(2) - Duration.FromNanoseconds(1)));
        Assert.False(IncidentActivity.IsActive(Created, Created, null, Created + Duration.FromHours(2)));
    }

    [Fact]
    public void Active_window_has_a_twelve_hour_cap_even_when_confirmed()
    {
        var lastConfirmed = Created + Duration.FromHours(11);
        Assert.True(IncidentActivity.IsActive(Created, lastConfirmed, null, Created + Duration.FromHours(12) - Duration.FromNanoseconds(1)));
        Assert.False(IncidentActivity.IsActive(Created, lastConfirmed, null, Created + Duration.FromHours(12)));
    }

    [Fact]
    public void Closed_incidents_are_never_active()
    {
        Assert.False(IncidentActivity.IsActive(Created, Created, Created, Created + Duration.FromMinutes(1)));
    }
}

public sealed class IncidentApiTests(ApiFactory factory) : IntegrationTest
{
    [Fact]
    public async Task Anonymous_reads_work_but_anonymous_writes_return_problem_details_401()
    {
        await factory.ResetAsync();
        var client = factory.CreateClient();
        var read = await client.SendAsync(ApiJson.Get($"/v1/incidents?bbox={TestData.Bbox}"));
        Assert.Equal(HttpStatusCode.OK, read.StatusCode);

        var create = await client.SendAsync(ApiJson.Post("/v1/incidents", new CreateIncidentRequest(IncidentCategory.Fire, "Smoke", 24.75, 59.43, "Tallinn")));
        Assert.Equal(HttpStatusCode.Unauthorized, create.StatusCode);
        Assert.Equal("application/problem+json", create.Content.Headers.ContentType?.MediaType);
        Assert.NotNull(await create.Content.Read<ApiProblem>());

        var vote = await client.SendAsync(ApiJson.Post($"/v1/incidents/{Guid.NewGuid()}/vote", new VoteIncidentRequest(IncidentVoteValue.Gone)));
        Assert.Equal(HttpStatusCode.Unauthorized, vote.StatusCode);
        var close = await client.SendAsync(ApiJson.Post($"/v1/incidents/{Guid.NewGuid()}/close", new { }));
        Assert.Equal(HttpStatusCode.Unauthorized, close.StatusCode);
    }

    [Fact]
    public async Task Reporter_identity_is_hidden_and_five_reports_per_day_is_enforced()
    {
        await factory.ResetAsync();
        var client = factory.CreateClient();
        HttpResponseMessage? first = null;
        for (var index = 0; index < 5; index++)
        {
            var response = await client.SendAsync(ApiJson.Post("/v1/incidents",
                new CreateIncidentRequest(IncidentCategory.TrafficCollision, "Road blocked", 24.75 + index * .001, 59.43, "Tallinn"), "incident-reporter"));
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            first ??= response;
        }

        var body = await first!.Content.ReadAsStringAsync();
        Assert.DoesNotContain("reporterId", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("incident-reporter", body, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("\"isReporter\":true", body, StringComparison.OrdinalIgnoreCase);

        var limited = await client.SendAsync(ApiJson.Post("/v1/incidents",
            new CreateIncidentRequest(IncidentCategory.Fire, "Smoke", 24.75, 59.43, "Tallinn"), "incident-reporter"));
        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.Equal("application/problem+json", limited.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Two_gone_votes_close_the_incident_and_votes_can_be_changed()
    {
        await factory.ResetAsync();
        var client = factory.CreateClient();
        var created = await client.SendAsync(ApiJson.Post("/v1/incidents",
            new CreateIncidentRequest(IncidentCategory.Fire, "Fire", 24.75, 59.43, "Tallinn"), "incident-owner"));
        var incident = (await created.Content.Read<IncidentResponse>())!;

        var first = await client.SendAsync(ApiJson.Post($"/v1/incidents/{incident.Id}/vote", new VoteIncidentRequest(IncidentVoteValue.Gone), "voter-one"));
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var changed = await client.SendAsync(ApiJson.Post($"/v1/incidents/{incident.Id}/vote", new VoteIncidentRequest(IncidentVoteValue.StillThere), "voter-one"));
        Assert.Equal(HttpStatusCode.OK, changed.StatusCode);
        var changedResponse = (await changed.Content.Read<IncidentResponse>())!;
        Assert.Equal(0, changedResponse.GoneCount);
        Assert.Equal(1, changedResponse.StillThereCount);
        Assert.Null(changedResponse.ClosedAt);
        var second = await client.SendAsync(ApiJson.Post($"/v1/incidents/{incident.Id}/vote", new VoteIncidentRequest(IncidentVoteValue.Gone), "voter-two"));
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        var beforeClose = (await second.Content.Read<IncidentResponse>())!;
        Assert.Equal(1, beforeClose.GoneCount);
        Assert.Equal(1, beforeClose.StillThereCount);
        Assert.Null(beforeClose.ClosedAt);

        var third = await client.SendAsync(ApiJson.Post($"/v1/incidents/{incident.Id}/vote", new VoteIncidentRequest(IncidentVoteValue.Gone), "voter-three"));
        Assert.Equal(HttpStatusCode.OK, third.StatusCode);
        var closed = (await third.Content.Read<IncidentResponse>())!;
        Assert.Equal(2, closed.GoneCount);
        Assert.Equal(1, closed.StillThereCount);
        Assert.NotNull(closed.ClosedAt);

        var fourth = await client.SendAsync(ApiJson.Post($"/v1/incidents/{incident.Id}/vote", new VoteIncidentRequest(IncidentVoteValue.Gone), "voter-four"));
        Assert.Equal(HttpStatusCode.Conflict, fourth.StatusCode);

        var list = await client.SendAsync(ApiJson.Get($"/v1/incidents?bbox={TestData.Bbox}"));
        Assert.Empty((await list.Content.Read<IncidentsResponse>())!.Items);
    }
}

internal sealed record ApiProblem(string? Type, string? Title, int? Status);
