using System.Text.RegularExpressions;

namespace Happengo.Api.Friends;

public readonly record struct FriendTagName(string Normalized, string Label);

/// <summary>
/// Owner-private friend tags. Comparison is case-insensitive. The label keeps the first spelling.
/// </summary>
public static partial class FriendTagRules
{
    public const int MaxLength = 30;

    public const int MaxCount = 20;

    public static bool TryNormalize(
        IReadOnlyList<string>? input,
        out IReadOnlyList<FriendTagName> tags,
        out string detail)
    {
        tags = [];
        var source = input ?? [];
        if (source.Count > MaxCount)
        {
            detail = $"At most {MaxCount} friend tags are allowed.";
            return false;
        }

        var seen = new HashSet<string>(StringComparer.Ordinal);
        var list = new List<FriendTagName>();
        foreach (var raw in source)
        {
            if (string.IsNullOrWhiteSpace(raw) || raw.Any(char.IsControl))
            {
                detail = "A friend tag is required and cannot contain control characters.";
                return false;
            }

            var label = Whitespace().Replace(raw.Trim(), " ");
            if (label.Length > MaxLength)
            {
                detail = $"A friend tag must be at most {MaxLength} characters.";
                return false;
            }

            var normalized = label.ToLowerInvariant();
            if (!seen.Add(normalized))
            {
                continue;
            }

            list.Add(new FriendTagName(normalized, label));
        }

        tags = list;
        detail = "";
        return true;
    }

    [GeneratedRegex(@"\s+", RegexOptions.CultureInvariant)]
    private static partial Regex Whitespace();
}
