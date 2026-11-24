using NodaTime;

namespace Happengo.Api.Identity;

/// <summary>
/// Internal user. Profile columns follow ADR 0003. They stay empty until the IdP token
/// carries standard OIDC <c>name</c>/<c>email</c> claims, or a later profile update.
/// </summary>
internal sealed class User
{
    public Guid Id { get; set; }

    public string Issuer { get; set; } = "";

    public string Subject { get; set; } = "";

    public string? DisplayName { get; set; }

    public string? Email { get; set; }

    public string? ProfilePhotoUrl { get; set; }

    /// <summary><c>en</c> or <c>pt-BR</c>. Null until the client stores a preference.</summary>
    public string? Language { get; set; }

    public bool ShareAttendanceWithFriends { get; set; } = true;

    public Instant CreatedAt { get; set; }
}
