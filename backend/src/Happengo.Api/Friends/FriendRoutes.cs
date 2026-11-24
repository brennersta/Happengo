using Happengo.Api.Identity;
using Happengo.Api.Infrastructure;
using Happengo.Api.Infrastructure.Auth;
using Happengo.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Happengo.Api.Friends;

public sealed record FriendInviteStatusResponse(bool Active);

public sealed record FriendInviteIssuedResponse(string Token, string Path);

public sealed record FriendInvitePreviewResponse(string? DisplayName);

public sealed record FriendResponse(Guid UserId, string? DisplayName, IReadOnlyList<string> Tags);

public sealed record ReplaceFriendTagsRequest(IReadOnlyList<string>? Tags);

internal static class FriendRoutes
{
    public static RouteGroupBuilder Map(RouteGroupBuilder group)
    {
        var friends = group.MapGroup("/friends").WithTags("Friends");

        friends.MapGet("", List)
            .WithName("ListFriends")
            .WithSummary("Friends of the caller, with the caller's private tags.")
            .WithDescription("Requires authentication. Display name only. Email is never returned. Tags are visible only to the person who set them.")
            .Produces<IReadOnlyList<FriendResponse>>()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        friends.MapGet("/invite", InviteStatus)
            .WithName("GetFriendInviteStatus")
            .WithSummary("Whether the caller has an active invite link.")
            .WithDescription("The token itself is not stored and is not returned. Rotate or create to receive a new token once.")
            .Produces<FriendInviteStatusResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        friends.MapPost("/invite", CreateInvite)
            .RequireRateLimiting(RateLimitPolicies.Writes)
            .WithName("CreateFriendInvite")
            .WithSummary("Issue the caller's invite link when none is active.")
            .Produces<FriendInviteIssuedResponse>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status409Conflict);

        friends.MapPost("/invite/rotate", RotateInvite)
            .RequireRateLimiting(RateLimitPolicies.Writes)
            .WithName("RotateFriendInvite")
            .WithSummary("Replace the caller's invite link. The previous token stops working.")
            .Produces<FriendInviteIssuedResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        friends.MapGet("/invites/{token}", PreviewInvite)
            .WithName("PreviewFriendInvite")
            .WithSummary("Display name of the person who issued this invite.")
            .Produces<FriendInvitePreviewResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        friends.MapPost("/invites/{token}/accept", AcceptInvite)
            .RequireRateLimiting(RateLimitPolicies.Writes)
            .WithName("AcceptFriendInvite")
            .WithSummary("Accept an invite and create a mutual friendship.")
            .WithDescription("Accepting again is idempotent. A user cannot accept their own invite. An unknown token is 404.")
            .Produces<FriendResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        friends.MapPut("/{userId:guid}/tags", ReplaceTags)
            .RequireRateLimiting(RateLimitPolicies.Writes)
            .WithName("ReplaceFriendTags")
            .WithSummary("Replace the caller's private tags for one friend.")
            .Produces<FriendResponse>()
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        friends.MapDelete("/{userId:guid}", Remove)
            .RequireRateLimiting(RateLimitPolicies.Writes)
            .WithName("RemoveFriend")
            .WithSummary("Delete the friendship both ways, and the caller's tags for that friend.")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<Results<Ok<IReadOnlyList<FriendResponse>>, ProblemHttpResult>> List(
        HappengoDbContext db,
        ViewerContext viewerContext,
        CancellationToken cancellationToken)
    {
        if (viewerContext.Viewer.UserId is not Guid userId)
        {
            return Unauthorized("A valid user identity is required to list friends.");
        }

        var friendIds = await FriendAccess.FriendIdsOf(db, userId).ToListAsync(cancellationToken);
        var people = await UserDirectory.DisplayNamesAsync(db, friendIds, cancellationToken);
        var tags = await db.FriendTags.AsNoTracking()
            .Where(tag => tag.OwnerId == userId && friendIds.Contains(tag.FriendUserId))
            .OrderBy(tag => tag.Label)
            .ToListAsync(cancellationToken);

        var response = people
            .OrderBy(person => person.DisplayName)
            .ThenBy(person => person.Id)
            .Select(person => new FriendResponse(
                person.Id,
                person.DisplayName,
                tags.Where(tag => tag.FriendUserId == person.Id).Select(tag => tag.Label).ToArray()))
            .ToArray();
        return TypedResults.Ok<IReadOnlyList<FriendResponse>>(response);
    }

    private static async Task<Results<Ok<FriendInviteStatusResponse>, ProblemHttpResult>> InviteStatus(
        HappengoDbContext db,
        ViewerContext viewerContext,
        CancellationToken cancellationToken)
    {
        if (viewerContext.Viewer.UserId is not Guid userId)
        {
            return Unauthorized("A valid user identity is required to read an invite link.");
        }

        var active = await db.FriendInvites.AsNoTracking().AnyAsync(row => row.UserId == userId, cancellationToken);
        return TypedResults.Ok(new FriendInviteStatusResponse(active));
    }

    private static async Task<Results<Created<FriendInviteIssuedResponse>, ProblemHttpResult>> CreateInvite(
        HappengoDbContext db,
        ViewerContext viewerContext,
        IClock clock,
        CancellationToken cancellationToken)
    {
        if (viewerContext.Viewer.UserId is not Guid userId)
        {
            return Unauthorized("A valid user identity is required to create an invite link.");
        }

        if (await db.FriendInvites.AnyAsync(row => row.UserId == userId, cancellationToken))
        {
            return Conflict("An invite link is already active. Rotate it to replace the old one.");
        }

        var issued = await IssueAsync(db, userId, clock.GetCurrentInstant(), cancellationToken);
        return TypedResults.Created("/v1/friends/invite", issued);
    }

    private static async Task<Results<Ok<FriendInviteIssuedResponse>, ProblemHttpResult>> RotateInvite(
        HappengoDbContext db,
        ViewerContext viewerContext,
        IClock clock,
        CancellationToken cancellationToken)
    {
        if (viewerContext.Viewer.UserId is not Guid userId)
        {
            return Unauthorized("A valid user identity is required to rotate an invite link.");
        }

        var now = clock.GetCurrentInstant();
        var existing = await db.FriendInvites.FirstOrDefaultAsync(row => row.UserId == userId, cancellationToken);
        if (existing is null)
        {
            var issued = await IssueAsync(db, userId, now, cancellationToken);
            return TypedResults.Ok(issued);
        }

        var token = InviteToken.New();
        existing.TokenHash = InviteToken.Hash(token);
        existing.CreatedAt = now;
        await db.SaveChangesAsync(cancellationToken);
        return TypedResults.Ok(new FriendInviteIssuedResponse(token, $"/friends/accept/{token}"));
    }

    private static async Task<Results<Ok<FriendInvitePreviewResponse>, ProblemHttpResult>> PreviewInvite(
        string token,
        HappengoDbContext db,
        ViewerContext viewerContext,
        CancellationToken cancellationToken)
    {
        if (viewerContext.Viewer.UserId is not Guid userId)
        {
            return Unauthorized("A valid user identity is required to open an invite link.");
        }

        var invite = await FindInviteAsync(db, token, cancellationToken);
        if (invite is null)
        {
            return UnknownInvite();
        }

        if (invite.UserId == userId)
        {
            return Conflict("You can't add yourself as a friend.");
        }

        var name = await UserDirectory.DisplayNameAsync(db, invite.UserId, cancellationToken);
        return TypedResults.Ok(new FriendInvitePreviewResponse(name));
    }

    private static async Task<Results<Ok<FriendResponse>, ProblemHttpResult>> AcceptInvite(
        string token,
        HappengoDbContext db,
        ViewerContext viewerContext,
        IClock clock,
        CancellationToken cancellationToken)
    {
        if (viewerContext.Viewer.UserId is not Guid userId)
        {
            return Unauthorized("A valid user identity is required to accept an invite link.");
        }

        var invite = await FindInviteAsync(db, token, cancellationToken);
        if (invite is null)
        {
            return UnknownInvite();
        }

        if (invite.UserId == userId)
        {
            return Conflict("You can't add yourself as a friend.");
        }

        if (!Friendship.TryOrder(invite.UserId, userId, out var low, out var high))
        {
            return Conflict("You can't add yourself as a friend.");
        }

        var existing = await db.Friendships
            .AnyAsync(row => row.UserLowId == low && row.UserHighId == high, cancellationToken);
        if (!existing)
        {
            db.Friendships.Add(new Friendship
            {
                Id = Guid.CreateVersion7(),
                UserLowId = low,
                UserHighId = high,
                CreatedAt = clock.GetCurrentInstant(),
            });
            try
            {
                await db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException)
            {
                db.ChangeTracker.Clear();
                var stored = await db.Friendships.AnyAsync(
                    row => row.UserLowId == low && row.UserHighId == high,
                    cancellationToken);
                if (!stored)
                {
                    throw;
                }
            }
        }

        return TypedResults.Ok(await OneFriendAsync(db, userId, invite.UserId, cancellationToken));
    }

    private static async Task<Results<Ok<FriendResponse>, ProblemHttpResult>> ReplaceTags(
        Guid userId,
        ReplaceFriendTagsRequest request,
        HappengoDbContext db,
        ViewerContext viewerContext,
        CancellationToken cancellationToken)
    {
        if (viewerContext.Viewer.UserId is not Guid ownerId)
        {
            return Unauthorized("A valid user identity is required to tag a friend.");
        }

        if (!await AreFriendsAsync(db, ownerId, userId, cancellationToken))
        {
            return UnknownFriend();
        }

        if (!FriendTagRules.TryNormalize(request.Tags, out var tags, out var detail))
        {
            return TypedResults.Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Invalid friend tags",
                detail: detail,
                type: ProblemTypes.InvalidFriend);
        }

        var current = await db.FriendTags
            .Where(tag => tag.OwnerId == ownerId && tag.FriendUserId == userId)
            .ToListAsync(cancellationToken);
        db.FriendTags.RemoveRange(current);
        foreach (var tag in tags)
        {
            db.FriendTags.Add(new FriendTag
            {
                Id = Guid.CreateVersion7(),
                OwnerId = ownerId,
                FriendUserId = userId,
                NormalizedTag = tag.Normalized,
                Label = tag.Label,
            });
        }

        await db.SaveChangesAsync(cancellationToken);
        return TypedResults.Ok(await OneFriendAsync(db, ownerId, userId, cancellationToken));
    }

    private static async Task<Results<NoContent, ProblemHttpResult>> Remove(
        Guid userId,
        HappengoDbContext db,
        ViewerContext viewerContext,
        CancellationToken cancellationToken)
    {
        if (viewerContext.Viewer.UserId is not Guid ownerId)
        {
            return Unauthorized("A valid user identity is required to remove a friend.");
        }

        if (!Friendship.TryOrder(ownerId, userId, out var low, out var high))
        {
            return UnknownFriend();
        }

        var friendship = await db.Friendships
            .FirstOrDefaultAsync(row => row.UserLowId == low && row.UserHighId == high, cancellationToken);
        if (friendship is null)
        {
            return UnknownFriend();
        }

        var tags = await db.FriendTags
            .Where(tag => (tag.OwnerId == ownerId && tag.FriendUserId == userId)
                || (tag.OwnerId == userId && tag.FriendUserId == ownerId))
            .ToListAsync(cancellationToken);
        db.FriendTags.RemoveRange(tags);
        db.Friendships.Remove(friendship);
        await db.SaveChangesAsync(cancellationToken);
        return TypedResults.NoContent();
    }

    private static async Task<FriendInviteIssuedResponse> IssueAsync(
        HappengoDbContext db,
        Guid userId,
        Instant now,
        CancellationToken cancellationToken)
    {
        var token = InviteToken.New();
        db.FriendInvites.Add(new FriendInvite
        {
            UserId = userId,
            TokenHash = InviteToken.Hash(token),
            CreatedAt = now,
        });
        await db.SaveChangesAsync(cancellationToken);
        return new FriendInviteIssuedResponse(token, $"/friends/accept/{token}");
    }

    private static async Task<FriendInvite?> FindInviteAsync(
        HappengoDbContext db,
        string token,
        CancellationToken cancellationToken)
    {
        if (!InviteToken.TryCanonicalize(token, out var canonical))
        {
            return null;
        }

        var hash = InviteToken.Hash(canonical);
        return await db.FriendInvites.AsNoTracking()
            .FirstOrDefaultAsync(row => row.TokenHash == hash, cancellationToken);
    }

    private static Task<bool> AreFriendsAsync(
        HappengoDbContext db,
        Guid left,
        Guid right,
        CancellationToken cancellationToken)
    {
        if (!Friendship.TryOrder(left, right, out var low, out var high))
        {
            return Task.FromResult(false);
        }

        return db.Friendships.AsNoTracking()
            .AnyAsync(row => row.UserLowId == low && row.UserHighId == high, cancellationToken);
    }

    private static async Task<FriendResponse> OneFriendAsync(
        HappengoDbContext db,
        Guid ownerId,
        Guid friendId,
        CancellationToken cancellationToken)
    {
        var person = (await UserDirectory.DisplayNamesAsync(db, [friendId], cancellationToken)).Single();
        var tags = await db.FriendTags.AsNoTracking()
            .Where(tag => tag.OwnerId == ownerId && tag.FriendUserId == friendId)
            .OrderBy(tag => tag.Label)
            .Select(tag => tag.Label)
            .ToListAsync(cancellationToken);
        return new FriendResponse(person.Id, person.DisplayName, tags);
    }

    private static ProblemHttpResult Unauthorized(string detail) =>
        TypedResults.Problem(
            statusCode: StatusCodes.Status401Unauthorized,
            title: "Authentication required",
            detail: detail,
            type: ProblemTypes.Unauthorized);

    private static ProblemHttpResult Conflict(string detail) =>
        TypedResults.Problem(
            statusCode: StatusCodes.Status409Conflict,
            title: "Friend invite conflict",
            detail: detail,
            type: ProblemTypes.InvalidFriend);

    private static ProblemHttpResult UnknownInvite() =>
        TypedResults.Problem(
            statusCode: StatusCodes.Status404NotFound,
            title: "Not found",
            detail: "No invite exists for this token.",
            type: ProblemTypes.NotFound);

    private static ProblemHttpResult UnknownFriend() =>
        TypedResults.Problem(
            statusCode: StatusCodes.Status404NotFound,
            title: "Not found",
            detail: "That person is not your friend.",
            type: ProblemTypes.NotFound);
}
