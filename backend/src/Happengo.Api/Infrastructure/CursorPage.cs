using System.Buffers.Text;
using System.Text;
using NodaTime;

namespace Happengo.Api.Infrastructure;

/// <summary>
/// Cursor page for list endpoints. The viewport query is capped, not paged (ADR 0006).
/// </summary>
public sealed record CursorPage<T>(IReadOnlyList<T> Items, string? NextCursor);

public static class Cursor
{
    public static string Encode(Instant instant, Guid id)
    {
        var text = $"{instant.ToUnixTimeTicks()}:{id:N}";
        return Base64Url.EncodeToString(Encoding.UTF8.GetBytes(text));
    }

    public static bool TryDecode(string cursor, out Instant instant, out Guid id)
    {
        instant = default;
        id = default;
        if (string.IsNullOrWhiteSpace(cursor) || cursor.Length > 256)
        {
            return false;
        }

        Span<byte> buffer = stackalloc byte[256];
        if (!Base64Url.TryDecodeFromChars(cursor, buffer, out var written))
        {
            return false;
        }

        var text = Encoding.UTF8.GetString(buffer[..written]);
        var split = text.Split(':', 2);
        if (split.Length != 2
            || !long.TryParse(split[0], out var ticks)
            || !Guid.TryParseExact(split[1], "N", out id))
        {
            return false;
        }

        instant = Instant.FromUnixTimeTicks(ticks);
        return true;
    }
}
