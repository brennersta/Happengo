namespace Happengo.Api.Infrastructure;

/// <summary>
/// Stable ProblemDetails type codes (ADR 0009). They are URIs so the payload stays RFC 9457.
/// The client translates the code; the server does not localize it.
/// </summary>
public static class ProblemTypes
{
    public const string InvalidBbox = "https://happengo.app/problems/invalid-bbox";
    public const string InvalidTags = "https://happengo.app/problems/invalid-tags";
    public const string InvalidEvent = "https://happengo.app/problems/invalid-event";
    public const string NotFound = "https://happengo.app/problems/not-found";
    public const string Unauthorized = "https://happengo.app/problems/unauthorized";
    public const string Forbidden = "https://happengo.app/problems/forbidden";
    public const string InvalidAttendance = "https://happengo.app/problems/invalid-attendance";
    public const string RateLimited = "https://happengo.app/problems/rate-limited";
    public const string Internal = "https://happengo.app/problems/internal-error";

    public static string ForStatus(int? status) => status switch
    {
        StatusCodes.Status400BadRequest => "https://happengo.app/problems/bad-request",
        StatusCodes.Status401Unauthorized => Unauthorized,
        StatusCodes.Status403Forbidden => Forbidden,
        StatusCodes.Status404NotFound => NotFound,
        StatusCodes.Status429TooManyRequests => RateLimited,
        _ => Internal,
    };
}
