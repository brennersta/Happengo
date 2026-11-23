using System.Net;
using Happengo.Api.Events;
using Happengo.Api.Events.CreateEvent;
using Happengo.Api.Friends;
using Happengo.Api.Infrastructure;
using Happengo.Api.Tests.Support;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Happengo.Api.Tests.Friendships;

public sealed class FriendsOnlyVisibilityTests(ApiFactory factory) : IntegrationTest
{
    [Fact]
    public async Task Friends_only_audience_follows_the_current_friendship_and_tags()
    {
        await factory.ResetAsync();
        var client = factory.CreateClient();
        var created = await CreateFriendsOnlyAsync(client, ["Close"]);
        var ownerId = await UserIdAsync("owner");
        var taggedId = await UserIdAsync("tagged");
        var plainId = await UserIdAsync("plain");
        await UserIdAsync("stranger");

        await factory.WithDb(async db =>
        {
            db.Friendships.Add(Friendship.Between(ownerId, taggedId, TestData.Now));
            db.Friendships.Add(Friendship.Between(ownerId, plainId, TestData.Now));
            db.FriendTags.Add(new FriendTag
            {
                Id = Guid.CreateVersion7(),
                OwnerId = ownerId,
                FriendUserId = taggedId,
                NormalizedTag = "close",
                Label = "Close",
            });

            var live = Events.EventReadTests.NewEvent(
                ownerId,
                "Live friends",
                EventVisibility.FriendsOnly,
                TestData.Now - Duration.FromMinutes(20),
                TestData.Now + Duration.FromHours(1));
            db.Events.Add(live);
            db.EventInvitedFriendTags.Add(new EventInvitedFriendTag
            {
                Id = Guid.CreateVersion7(),
                EventId = live.Id,
                NormalizedTag = "close",
                Label = "Close",
            });
            await db.SaveChangesAsync();
        });

        var liveId = await factory.WithDb(db =>
            db.Events.Where(e => e.Title == "Live friends").Select(e => e.Id).SingleAsync());

        Assert.Equal(HttpStatusCode.NotFound, (await GetAsync(client, created.Id, "stranger")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await GetAsync(client, liveId, "stranger")).StatusCode);
        Assert.DoesNotContain(created.Id, await MapIdsAsync(client, "stranger"));
        Assert.DoesNotContain(liveId, await MapIdsAsync(client, "stranger"));

        Assert.Equal(HttpStatusCode.NotFound, (await GetAsync(client, created.Id, "plain")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await GetAsync(client, liveId, "plain")).StatusCode);
        Assert.DoesNotContain(created.Id, await MapIdsAsync(client, "plain"));
        Assert.DoesNotContain(liveId, await MapIdsAsync(client, "plain"));

        var seen = await GetAsync(client, created.Id, "tagged");
        Assert.Equal(HttpStatusCode.OK, seen.StatusCode);
        var seenBody = (await seen.Content.Read<EventResponse>())!;
        Assert.Null(seenBody.InvitedFriendTags);
        Assert.Contains(created.Id, await MapIdsAsync(client, "tagged"));

        var live = await GetAsync(client, liveId, "tagged");
        Assert.Equal(HttpStatusCode.OK, live.StatusCode);
        Assert.True((await live.Content.Read<EventResponse>())!.HappeningNow);
        Assert.Contains(liveId, await MapIdsAsync(client, "tagged"));

        var owner = await GetAsync(client, created.Id, "owner");
        Assert.Equal(["Close"], (await owner.Content.Read<EventResponse>())!.InvitedFriendTags);

        var removed = await client.SendAsync(ApiJson.Delete($"/v1/friends/{taggedId}", "owner"));
        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await GetAsync(client, created.Id, "tagged")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await GetAsync(client, liveId, "tagged")).StatusCode);
        Assert.DoesNotContain(created.Id, await MapIdsAsync(client, "tagged"));
        Assert.DoesNotContain(liveId, await MapIdsAsync(client, "tagged"));
    }

    [Fact]
    public async Task A_friends_only_event_without_tags_is_visible_to_every_friend()
    {
        await factory.ResetAsync();
        var client = factory.CreateClient();
        var created = await CreateFriendsOnlyAsync(client, []);
        var ownerId = await UserIdAsync("owner");
        var friendId = await UserIdAsync("friend");
        await factory.WithDb(async db =>
        {
            db.Friendships.Add(Friendship.Between(ownerId, friendId, TestData.Now));
            await db.SaveChangesAsync();
        });

        Assert.Equal(HttpStatusCode.OK, (await GetAsync(client, created.Id, "friend")).StatusCode);
        Assert.Contains(created.Id, await MapIdsAsync(client, "friend"));
        Assert.Equal(HttpStatusCode.NotFound, (await GetAsync(client, created.Id, "stranger")).StatusCode);
    }

    private static async Task<EventResponse> CreateFriendsOnlyAsync(HttpClient client, string[] tags)
    {
        var body = new CreateEventRequest
        {
            Title = "Friends dinner",
            Description = "Private",
            StartAt = TestData.Now.ToDateTimeOffset().AddHours(1),
            EndAt = TestData.Now.ToDateTimeOffset().AddHours(3),
            TimeZoneId = "Europe/Tallinn",
            Address = "Tallinn",
            Longitude = TestData.InsideLng,
            Latitude = TestData.InsideLat,
            Visibility = EventVisibility.FriendsOnly,
            ApprovalMode = ApprovalMode.Open,
            Tags = [EventTag.Food],
            InvitedFriendTags = tags,
        };
        var response = await client.SendAsync(ApiJson.Post("/v1/events", body, "owner"));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.Read<EventResponse>())!;
    }

    private static Task<HttpResponseMessage> GetAsync(HttpClient client, Guid id, string subject) =>
        client.SendAsync(ApiJson.Get($"/v1/events/{id}", subject));

    private static async Task<Guid[]> MapIdsAsync(HttpClient client, string subject)
    {
        var response = await client.SendAsync(ApiJson.Get($"/v1/events?bbox={TestData.Bbox}", subject));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.Read<EventMapResponse>())!.Items.Select(item => item.Id).ToArray();
    }

    private Task<Guid> UserIdAsync(string subject) =>
        factory.WithDb(async db =>
        {
            var id = await db.Users.Where(user => user.Subject == subject).Select(user => (Guid?)user.Id).FirstOrDefaultAsync();
            if (id is Guid existing)
            {
                return existing;
            }

            var user = Events.EventReadTests.NewUser(subject);
            user.DisplayName = subject;
            db.Users.Add(user);
            await db.SaveChangesAsync();
            return user.Id;
        });
}
