using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Happengo.Api.Tests.Support;

internal sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Test";

    public const string HeaderName = "X-Test-User";
    public const string DisplayNameHeaderName = "X-Test-Display-Name";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(HeaderName, out var value) || string.IsNullOrWhiteSpace(value))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var subject = value.ToString();
        var displayName = Request.Headers.TryGetValue(DisplayNameHeaderName, out var nameValue)
            ? nameValue.ToString()
            : subject;
        var identity = new ClaimsIdentity(
            [
                new Claim("iss", TestData.Issuer),
                new Claim("sub", subject),
                new Claim("email", $"{subject}@example.com"),
                new Claim("name", displayName),
            ],
            SchemeName);
        var principal = new ClaimsPrincipal(identity);
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(principal, SchemeName)));
    }
}
