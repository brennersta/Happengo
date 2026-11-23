using Happengo.Api.Friends;

namespace Happengo.Api.Tests.Friendships;

public sealed class FriendTagRulesTests
{
    [Fact]
    public void Normalizes_case_and_whitespace_and_keeps_the_first_spelling()
    {
        var ok = FriendTagRules.TryNormalize(["  Close   Friends ", "close friends", "Family"], out var tags, out var detail);

        Assert.True(ok);
        Assert.Equal("", detail);
        Assert.Equal(["Close Friends", "Family"], tags.Select(tag => tag.Label).ToArray());
        Assert.Equal(["close friends", "family"], tags.Select(tag => tag.Normalized).ToArray());
    }

    [Theory]
    [InlineData(31)]
    [InlineData(20)]
    public void Rejects_limits(int kind)
    {
        var input = kind == 31
            ? new[] { new string('a', 31) }
            : Enumerable.Range(0, 21).Select(index => $"tag-{index}").ToArray();

        var ok = FriendTagRules.TryNormalize(input, out _, out var detail);

        Assert.False(ok);
        Assert.False(string.IsNullOrWhiteSpace(detail));
    }

    [Fact]
    public void Empty_input_is_a_cleared_list()
    {
        Assert.True(FriendTagRules.TryNormalize(null, out var tags, out _));
        Assert.Empty(tags);
        Assert.True(FriendTagRules.TryNormalize([], out tags, out _));
        Assert.Empty(tags);
    }
}
