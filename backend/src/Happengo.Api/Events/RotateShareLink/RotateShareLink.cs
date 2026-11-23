using Happengo.Api.Infrastructure;
using Happengo.Api.Infrastructure.Auth;
using Happengo.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Happengo.Api.Events.RotateShareLink;

public sealed record RotateShareLinkResponse(Guid EventId, string ShareToken);

internal static class RotateShareLink
{
    public static RouteGroupBuilder Map(RouteGroupBuilder group)
    {
        group.MapPost("/events/{eventId:guid}/share-link", Handle)
            .AllowAnonymous()
            .RequireRateLimiting(RateLimitPolicies.Writes)
            .WithName("RotateEventShareLink")
            .WithTags("Events")
            .WithSummary("Rotate an unlisted event's share link.")
            .WithDescription("Owner only. Returns the new plaintext token once; only its SHA-256 hash is stored. Rotation creates no attendance or invite grants.")
            .Produces<RotateShareLinkResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<Results<Ok<RotateShareLinkResponse>, ProblemHttpResult>> Handle(
        Guid eventId,
        HappengoDbContext db,
        ViewerContext viewerContext,
        IClock clock,
        CancellationToken cancellationToken)
    {
        if (viewerContext.Viewer.UserId is not Guid ownerId)
        {
            return Problems.Unauthorized("A valid user identity is required to rotate an event share link.");
        }

        var item = await db.Events.FirstOrDefaultAsync(
            row => row.Id == eventId
                && row.OwnerId == ownerId
                && row.Visibility == EventVisibility.Unlisted,
            cancellationToken);
        if (item is null)
        {
            return Problems.NotFoundEvent();
        }

        var plaintextToken = ShareToken.New();
        item.ShareTokenHash = ShareToken.Hash(plaintextToken);
        item.UpdatedAt = clock.GetCurrentInstant();
        await db.SaveChangesAsync(cancellationToken);

        return TypedResults.Ok(new RotateShareLinkResponse(item.Id, plaintextToken));
    }
}
