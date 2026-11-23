using Happengo.Api.Infrastructure.Persistence;

namespace Happengo.Api.Friends;

/// <summary>
/// Public read model so other features can apply the friendship rule without using Friends entities.
/// </summary>
public sealed class FriendLink
{
    public Guid UserLowId { get; init; }

    public Guid UserHighId { get; init; }
}

public sealed class OwnedFriendTag
{
    public Guid OwnerId { get; init; }

    public Guid FriendUserId { get; init; }

    public string NormalizedTag { get; init; } = "";
}

public static class FriendAccess
{
    public static IQueryable<FriendLink> Links(HappengoDbContext db) =>
        db.Friendships.Select(row => new FriendLink
        {
            UserLowId = row.UserLowId,
            UserHighId = row.UserHighId,
        });

    public static IQueryable<OwnedFriendTag> Tags(HappengoDbContext db) =>
        db.FriendTags.Select(row => new OwnedFriendTag
        {
            OwnerId = row.OwnerId,
            FriendUserId = row.FriendUserId,
            NormalizedTag = row.NormalizedTag,
        });

    public static IQueryable<Guid> FriendIdsOf(HappengoDbContext db, Guid userId) =>
        db.Friendships
            .Where(row => row.UserLowId == userId || row.UserHighId == userId)
            .Select(row => row.UserLowId == userId ? row.UserHighId : row.UserLowId);
}
