using NodaTime;

namespace Happengo.Api.Tests.Support;

public sealed class MutableClock : IClock
{
    private long _unixTicks;

    public MutableClock(Instant start) => Set(start);

    public Instant GetCurrentInstant() => Instant.FromUnixTimeTicks(Interlocked.Read(ref _unixTicks));

    public void Set(Instant now) => Interlocked.Exchange(ref _unixTicks, now.ToUnixTimeTicks());
}
