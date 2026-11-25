using Happengo.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Happengo.Api.Identity;

public sealed record UserName(Guid Id, string? DisplayName);

public static class UserDirectory
{
    public static Task<bool> IsModeratorAsync(HappengoDbContext db, Guid userId, CancellationToken cancellationToken) =>
        db.Users.AsNoTracking().AnyAsync(user => user.Id == userId && user.IsModerator, cancellationToken);

    public static async Task<Guid> GetOrCreateAsync(
        HappengoDbContext db,
        string issuer,
        string subject,
        string? email,
        string? displayName,
        IReadOnlySet<string> moderatorUserIds,
        Instant createdAt,
        CancellationToken cancellationToken)
    {
        var existing = await db.Users
            .Where(user => user.Issuer == issuer && user.Subject == subject)
            .Select(user => new { user.Id, user.IsModerator })
            .FirstOrDefaultAsync(cancellationToken);

        if (existing is not null)
        {
            var isModerator = moderatorUserIds.Contains(subject);
            if (existing.IsModerator != isModerator)
            {
                await db.Users.Where(user => user.Id == existing.Id)
                    .ExecuteUpdateAsync(update => update.SetProperty(user => user.IsModerator, isModerator), cancellationToken);
            }
            return existing.Id;
        }

        var user = new User
        {
            Id = Guid.CreateVersion7(),
            Issuer = issuer,
            Subject = subject,
            Email = Fit(email, 320),
            DisplayName = Fit(displayName, 200),
            IsModerator = moderatorUserIds.Contains(subject),
            CreatedAt = createdAt,
        };

        db.Users.Add(user);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
            return user.Id;
        }
        catch (DbUpdateException)
        {
            db.Entry(user).State = EntityState.Detached;
            var racedUserId = await db.Users
                .Where(row => row.Issuer == issuer && row.Subject == subject)
                .Select(row => row.Id)
                .SingleAsync(cancellationToken);
            var isModerator = moderatorUserIds.Contains(subject);
            await db.Users.Where(row => row.Id == racedUserId)
                .ExecuteUpdateAsync(update => update.SetProperty(row => row.IsModerator, isModerator), cancellationToken);
            return racedUserId;
        }
    }

    public static async Task<IReadOnlyList<UserName>> DisplayNamesAsync(
        HappengoDbContext db,
        IReadOnlyCollection<Guid> userIds,
        CancellationToken cancellationToken)
    {
        if (userIds.Count == 0)
        {
            return [];
        }

        return await db.Users.AsNoTracking()
            .Where(user => userIds.Contains(user.Id))
            .Select(user => new UserName(user.Id, user.DisplayName))
            .ToListAsync(cancellationToken);
    }

    public static Task<string?> DisplayNameAsync(
        HappengoDbContext db,
        Guid userId,
        CancellationToken cancellationToken) =>
        db.Users.AsNoTracking()
            .Where(user => user.Id == userId)
            .Select(user => user.DisplayName)
            .FirstAsync(cancellationToken);

    private static string? Fit(string? value, int max)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        return trimmed.Length <= max ? trimmed : trimmed[..max];
    }
}
