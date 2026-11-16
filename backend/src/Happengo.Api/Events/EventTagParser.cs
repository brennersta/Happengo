namespace Happengo.Api.Events;

internal static class EventTagParser
{
    public static bool TryParse(IEnumerable<string>? raw, out List<EventTag> tags, out string detail)
    {
        tags = [];
        if (raw is null)
        {
            detail = "";
            return true;
        }

        var seen = new HashSet<EventTag>();
        foreach (var value in raw)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                continue;
            }

            foreach (var part in value.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries))
            {
                if (!Enum.GetNames<EventTag>().Contains(part, StringComparer.Ordinal)
                    || !Enum.TryParse(part, ignoreCase: false, out EventTag tag))
                {
                    detail = $"Unknown tag '{part}'. Tags are {string.Join(", ", Enum.GetNames<EventTag>())}.";
                    tags = [];
                    return false;
                }

                seen.Add(tag);
            }
        }

        tags = [.. seen];
        detail = "";
        return true;
    }
}
