using Happengo.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using NodaTime;

namespace Happengo.Api.Identity;

public static class UserDirectory
{
    public static async Task<Guid> GetOrCreateAsync(
        HappengoDbContext db,
        string issuer,
        string subject,
        string? email,
        string? displayName,
        Instant createdAt,
        CancellationToken cancellationToken)
    {
        var existing = await db.Users
            .Where(user => user.Issuer == issuer && user.Subject == subject)
            .Select(user => (Guid?)user.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (existing is Guid id)
        {
            return id;
        }

        var user = new User
        {
            Id = Guid.CreateVersion7(),
            Issuer = issuer,
            Subject = subject,
            Email = Fit(email, 320),
            DisplayName = Fit(displayName, 200),
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
            return await db.Users
                .Where(row => row.Issuer == issuer && row.Subject == subject)
                .Select(row => row.Id)
                .SingleAsync(cancellationToken);
        }
    }

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
