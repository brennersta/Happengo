using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Happengo.Api.Identity;

internal sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users", table =>
            table.HasCheckConstraint(
                "ck_users_language",
                "language IS NULL OR language IN ('en', 'pt-BR')"));

        builder.Property(user => user.Issuer).HasMaxLength(500).IsRequired();
        builder.Property(user => user.Subject).HasMaxLength(200).IsRequired();
        builder.Property(user => user.DisplayName).HasMaxLength(200);
        builder.Property(user => user.Email).HasMaxLength(320);
        builder.Property(user => user.ProfilePhotoUrl).HasMaxLength(2000);
        builder.Property(user => user.Language).HasMaxLength(8);
        builder.Property(user => user.ShareAttendanceWithFriends).HasDefaultValue(true).IsRequired();

        builder.HasIndex(user => new { user.Issuer, user.Subject }).IsUnique();
    }
}
