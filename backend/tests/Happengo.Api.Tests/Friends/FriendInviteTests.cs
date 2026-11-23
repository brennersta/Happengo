using System.Net;
using Happengo.Api.Friends;
using Happengo.Api.Infrastructure;
using Happengo.Api.Tests.Support;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Happengo.Api.Tests.Friendships;

public sealed class FriendInviteTests(ApiFactory factory) : IntegrationTest
{
    [Fact]
    public async Task Invite_accept_tag_and_remove_follow_the_friendship_rules()
    {
        await factory.ResetAsync();
        var client = factory.CreateClient();

        var anonymous = await client.SendAsync(ApiJson.Get("/v1/friends"));
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        Assert.Equal(ProblemTypes.Unauthorized, (await anonymous.Content.Read<ProblemDetails>())!.Type);

        var created = await client.SendAsync(ApiJson.Post("/v1/friends/invite", new { }, "ada"));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var issued = (await created.Content.Read<FriendInviteIssuedResponse>())!;
        Assert.Equal(22, issued.Token.Length);
        Assert.DoesNotContain("ada", issued.Path, StringComparison.OrdinalIgnoreCase);
        Assert.StartsWith("/friends/accept/", issued.Path, StringComparison.Ordinal);

        await factory.WithDb(async db =>
        {
            var row = await db.FriendInvites.SingleAsync();
            Assert.Equal(InviteToken.Hash(issued.Token), row.TokenHash);
            Assert.DoesNotContain(issued.Token, Convert.ToHexString(row.TokenHash), StringComparison.Ordinal);
        });

        var again = await client.SendAsync(ApiJson.Post("/v1/friends/invite", new { }, "ada"));
        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);
        Assert.Equal(ProblemTypes.InvalidFriend, (await again.Content.Read<ProblemDetails>())!.Type);

        var status = await client.SendAsync(ApiJson.Get("/v1/friends/invite", "ada"));
        var statusBody = await status.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, status.StatusCode);
        Assert.DoesNotContain(issued.Token, statusBody, StringComparison.Ordinal);

        var unknown = await client.SendAsync(ApiJson.Post("/v1/friends/invites/not-a-token/accept", new { }, "bea"));
        Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);
        Assert.Equal(ProblemTypes.NotFound, (await unknown.Content.Read<ProblemDetails>())!.Type);

        var self = await client.SendAsync(ApiJson.Post($"/v1/friends/invites/{issued.Token}/accept", new { }, "ada"));
        Assert.Equal(HttpStatusCode.Conflict, self.StatusCode);

        var preview = await client.SendAsync(ApiJson.Get($"/v1/friends/invites/{issued.Token}", "bea"));
        Assert.Equal(HttpStatusCode.OK, preview.StatusCode);
        var previewBody = (await preview.Content.Read<FriendInvitePreviewResponse>())!;
        Assert.Equal("ada", previewBody.DisplayName);

        var accepted = await client.SendAsync(ApiJson.Post($"/v1/friends/invites/{issued.Token}/accept", new { }, "bea"));
        Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);
        var againAccept = await client.SendAsync(ApiJson.Post($"/v1/friends/invites/{issued.Token}/accept", new { }, "bea"));
        Assert.Equal(HttpStatusCode.OK, againAccept.StatusCode);
        Assert.Equal(1, await factory.WithDb(db => db.Friendships.CountAsync()));

        var tagged = await client.SendAsync(ApiJson.Put(
            $"/v1/friends/{(await againAccept.Content.Read<FriendResponse>())!.UserId}/tags",
            new ReplaceFriendTagsRequest(["Family", " family ", "Close"]),
            "bea"));
        Assert.Equal(HttpStatusCode.OK, tagged.StatusCode);
        var friend = (await tagged.Content.Read<FriendResponse>())!;
        Assert.Equal(["Close", "Family"], friend.Tags.OrderBy(tag => tag).ToArray());

        var list = await client.SendAsync(ApiJson.Get("/v1/friends", "bea"));
        var listJson = await list.Content.ReadAsStringAsync();
        Assert.DoesNotContain("@", listJson, StringComparison.Ordinal);
        Assert.DoesNotContain("email", listJson, StringComparison.OrdinalIgnoreCase);
        var adaView = await client.SendAsync(ApiJson.Get("/v1/friends", "ada"));
        var adaFriends = (await adaView.Content.Read<List<FriendResponse>>())!;
        Assert.Empty(adaFriends[0].Tags);

        var tooLong = await client.SendAsync(ApiJson.Put(
            $"/v1/friends/{friend.UserId}/tags",
            new ReplaceFriendTagsRequest([new string('x', 31)]),
            "bea"));
        Assert.Equal(HttpStatusCode.BadRequest, tooLong.StatusCode);

        var rotated = await client.SendAsync(ApiJson.Post("/v1/friends/invite/rotate", new { }, "ada"));
        var next = (await rotated.Content.Read<FriendInviteIssuedResponse>())!;
        Assert.NotEqual(issued.Token, next.Token);
        var oldToken = await client.SendAsync(ApiJson.Post($"/v1/friends/invites/{issued.Token}/accept", new { }, "cy"));
        Assert.Equal(HttpStatusCode.NotFound, oldToken.StatusCode);

        var removed = await client.SendAsync(ApiJson.Delete($"/v1/friends/{friend.UserId}", "bea"));
        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
        Assert.Equal(0, await factory.WithDb(db => db.Friendships.CountAsync()));
        Assert.Equal(0, await factory.WithDb(db => db.FriendTags.CountAsync(tag => tag.OwnerId != friend.UserId)));
    }
}
