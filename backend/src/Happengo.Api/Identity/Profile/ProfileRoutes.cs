using Happengo.Api.Infrastructure;
using Happengo.Api.Infrastructure.Auth;
using Happengo.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;

namespace Happengo.Api.Identity.Profile;

internal static class ProfileRoutes
{
    public static RouteGroupBuilder Map(RouteGroupBuilder group)
    {
        group.MapGet("/me", GetMe)
            .AllowAnonymous()
            .RequireRateLimiting(RateLimitPolicies.Auth)
            .WithName("GetCurrentUser")
            .WithTags("Profile")
            .WithSummary("Get the signed-in user's profile.")
            .Produces<ProfileResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPut("/me/display-name", UpdateDisplayName)
            .AllowAnonymous()
            .RequireRateLimiting(RateLimitPolicies.Writes)
            .WithName("UpdateCurrentUserDisplayName")
            .WithTags("Profile")
            .WithSummary("Set the signed-in user's display name.")
            .Produces<ProfileResponse>()
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPut("/me/attendance-sharing", UpdateAttendanceSharing)
            .AllowAnonymous()
            .RequireRateLimiting(RateLimitPolicies.Writes)
            .WithName("UpdateCurrentUserAttendanceSharing")
            .WithTags("Profile")
            .WithSummary("Set whether the signed-in user's friends can see their event attendance.")
            .Produces<ProfileResponse>()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<Results<Ok<ProfileResponse>, ProblemHttpResult>> GetMe(
        HappengoDbContext db,
        ViewerContext viewerContext,
        CancellationToken cancellationToken)
    {
        if (viewerContext.Viewer.UserId is not Guid userId)
        {
            return Problems.Unauthorized("A valid user identity is required to read the profile.");
        }

        var profile = await db.Users.AsNoTracking()
            .Where(user => user.Id == userId)
            .Select(user => new ProfileResponse(user.Id, user.DisplayName, user.ShareAttendanceWithFriends))
            .FirstOrDefaultAsync(cancellationToken);
        return profile is null ? Problems.NotFoundProfile() : TypedResults.Ok(profile);
    }

    private static async Task<Results<Ok<ProfileResponse>, ProblemHttpResult>> UpdateDisplayName(
        UpdateDisplayNameRequest request,
        HappengoDbContext db,
        ViewerContext viewerContext,
        CancellationToken cancellationToken)
    {
        if (viewerContext.Viewer.UserId is not Guid userId)
        {
            return Problems.Unauthorized("A valid user identity is required to update the profile.");
        }

        var displayName = request.DisplayName?.Trim();
        if (string.IsNullOrEmpty(displayName) || displayName.Length > 40)
        {
            return Problems.InvalidProfile("Display name must contain between 1 and 40 characters after trimming.");
        }

        var user = await db.Users.FirstOrDefaultAsync(row => row.Id == userId, cancellationToken);
        if (user is null)
        {
            return Problems.NotFoundProfile();
        }

        user.DisplayName = displayName;
        await db.SaveChangesAsync(cancellationToken);
        return TypedResults.Ok(new ProfileResponse(user.Id, user.DisplayName, user.ShareAttendanceWithFriends));
    }

    private static async Task<Results<Ok<ProfileResponse>, ProblemHttpResult>> UpdateAttendanceSharing(
        UpdateAttendanceSharingRequest request,
        HappengoDbContext db,
        ViewerContext viewerContext,
        CancellationToken cancellationToken)
    {
        if (viewerContext.Viewer.UserId is not Guid userId)
        {
            return Problems.Unauthorized("A valid user identity is required to update attendance sharing.");
        }

        var user = await db.Users.FirstOrDefaultAsync(row => row.Id == userId, cancellationToken);
        if (user is null)
        {
            return Problems.NotFoundProfile();
        }

        user.ShareAttendanceWithFriends = request.ShareAttendanceWithFriends;
        await db.SaveChangesAsync(cancellationToken);
        return TypedResults.Ok(new ProfileResponse(user.Id, user.DisplayName, user.ShareAttendanceWithFriends));
    }
}
