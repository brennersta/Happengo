using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Happengo.Api.Friends;

internal sealed class FriendshipConfiguration : IEntityTypeConfiguration<Friendship>
{
    public void Configure(EntityTypeBuilder<Friendship> builder)
    {
        builder.ToTable("friendships", table =>
            table.HasCheckConstraint("ck_friendships_distinct", "user_low_id <> user_high_id"));
        builder.HasIndex(row => new { row.UserLowId, row.UserHighId }).IsUnique();
        builder.HasIndex(row => row.UserHighId);
    }
}

internal sealed class FriendTagConfiguration : IEntityTypeConfiguration<FriendTag>
{
    public void Configure(EntityTypeBuilder<FriendTag> builder)
    {
        builder.ToTable("friend_tags", table =>
        {
            table.HasCheckConstraint("ck_friend_tags_distinct", "owner_id <> friend_user_id");
            table.HasCheckConstraint("ck_friend_tags_length", "char_length(normalized_tag) BETWEEN 1 AND 30");
        });
        builder.Property(row => row.NormalizedTag).HasMaxLength(30).IsRequired();
        builder.Property(row => row.Label).HasMaxLength(30).IsRequired();
        builder.HasIndex(row => new { row.OwnerId, row.FriendUserId, row.NormalizedTag }).IsUnique();
        builder.HasIndex(row => new { row.OwnerId, row.FriendUserId });
    }
}

internal sealed class FriendInviteConfiguration : IEntityTypeConfiguration<FriendInvite>
{
    public void Configure(EntityTypeBuilder<FriendInvite> builder)
    {
        builder.ToTable("friend_invites");
        builder.HasKey(row => row.UserId);
        builder.Property(row => row.TokenHash).HasColumnType("bytea").IsRequired();
        builder.HasIndex(row => row.TokenHash).IsUnique();
    }
}
