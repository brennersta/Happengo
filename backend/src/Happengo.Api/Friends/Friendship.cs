using NodaTime;

namespace Happengo.Api.Friends;

/// <summary>One row per unordered pair. A one-sided friendship cannot be stored.</summary>
internal sealed class Friendship
{
    public Guid Id { get; set; }

    public Guid UserLowId { get; set; }

    public Guid UserHighId { get; set; }

    public Instant CreatedAt { get; set; }

    public static bool TryOrder(Guid left, Guid right, out Guid low, out Guid high)
    {
        low = default;
        high = default;
        if (left == right)
        {
            return false;
        }

        if (string.CompareOrdinal(left.ToString("N"), right.ToString("N")) < 0)
        {
            low = left;
            high = right;
        }
        else
        {
            low = right;
            high = left;
        }

        return true;
    }

    public static Friendship Between(Guid left, Guid right, Instant createdAt)
    {
        if (!TryOrder(left, right, out var low, out var high))
        {
            throw new ArgumentException("A user cannot be friends with themselves.", nameof(right));
        }

        return new Friendship
        {
            Id = Guid.CreateVersion7(),
            UserLowId = low,
            UserHighId = high,
            CreatedAt = createdAt,
        };
    }
}
