using NodaTime;

namespace Happengo.Api.Tests.Support;

internal static class TestData
{
    public static readonly Instant Now = Instant.FromUtc(2026, 11, 16, 12, 0);

    public const string Issuer = "https://idp.example";

    public const string Bbox = "24.7,59.4,24.9,59.5";

    public const double InsideLng = 24.8;

    public const double InsideLat = 59.45;
}
