using Happengo.Api.Infrastructure;
using NodaTime;

namespace Happengo.Api.Tests.Infrastructure;

public sealed class CursorTests
{
    [Fact]
    public void Round_trips_an_instant_and_id()
    {
        var instant = Instant.FromUtc(2026, 11, 16, 12, 0);
        var id = Guid.CreateVersion7();
        var cursor = Cursor.Encode(instant, id);

        Assert.True(Cursor.TryDecode(cursor, out var decodedInstant, out var decodedId));
        Assert.Equal(instant, decodedInstant);
        Assert.Equal(id, decodedId);
    }

    [Fact]
    public void Rejects_garbage()
    {
        Assert.False(Cursor.TryDecode("not-a-cursor", out _, out _));
    }
}
