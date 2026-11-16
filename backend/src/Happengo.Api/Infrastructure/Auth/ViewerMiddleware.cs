using Happengo.Api.Identity;
using Happengo.Api.Infrastructure.Persistence;
using NodaTime;

namespace Happengo.Api.Infrastructure.Auth;

internal sealed class ViewerMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(
        HttpContext context,
        HappengoDbContext db,
        ViewerContext viewer,
        IClock clock)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var issuer = context.User.FindFirst("iss")?.Value;
            var subject = context.User.FindFirst("sub")?.Value;
            if (!string.IsNullOrWhiteSpace(issuer) && !string.IsNullOrWhiteSpace(subject))
            {
                var userId = await UserDirectory.GetOrCreateAsync(
                    db,
                    issuer,
                    subject,
                    context.User.FindFirst("email")?.Value,
                    context.User.FindFirst("name")?.Value,
                    clock.GetCurrentInstant(),
                    context.RequestAborted);
                viewer.SignIn(userId);
            }
        }

        await next(context);
    }
}
