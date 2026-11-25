using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Happengo.Api.Events;

internal sealed class EventConfiguration : IEntityTypeConfiguration<Event>
{
    public void Configure(EntityTypeBuilder<Event> builder)
    {
        builder.ToTable("events", table =>
        {
            table.HasCheckConstraint("ck_events_time_order", "end_at > start_at");
            table.HasCheckConstraint(
                "ck_events_duration",
                "end_at <= start_at + interval '7 days'");
            table.HasCheckConstraint("ck_events_visibility", StoredVisibility.Check);
            table.HasCheckConstraint("ck_events_approval_mode", StoredApprovalMode.Check);
            table.HasCheckConstraint("ck_events_tags", StoredTags.Check);
            table.HasCheckConstraint("ck_events_hide_reason", "hide_reason IS NULL OR char_length(hide_reason) BETWEEN 1 AND 500");
        });

        builder.Property(e => e.Title).HasMaxLength(200).IsRequired();
        builder.Property(e => e.Description).HasMaxLength(4000);
        builder.Property(e => e.TimeZoneId).HasMaxLength(64).IsRequired();
        builder.Property(e => e.Address).HasMaxLength(500).IsRequired();
        builder.Property(e => e.HideReason).HasColumnName("hide_reason").HasMaxLength(500);
        builder.Property(e => e.ShareTokenHash)
            .HasColumnType("bytea")
            .IsRequired();
        builder.Property(e => e.CoverBlobName).HasMaxLength(1024);
        builder.Property(e => e.CancelledAt).HasColumnName("cancelled_at");
        builder.Property(e => e.HiddenAt).HasColumnName("hidden_at");

        builder.Property(e => e.Location)
            .HasColumnType("geometry(Point,4326)")
            .IsRequired();

        builder.Property(e => e.Visibility)
            .HasConversion(
                value => StoredVisibility.ToProvider(value),
                value => StoredVisibility.FromProvider(value))
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(e => e.ApprovalMode)
            .HasConversion(
                value => StoredApprovalMode.ToProvider(value),
                value => StoredApprovalMode.FromProvider(value))
            .HasMaxLength(32)
            .IsRequired();

        builder.PrimitiveCollection(e => e.Tags)
            .HasColumnType("text[]")
            .ElementType()
            .HasConversion<string>()
            .HasMaxLength(32);

        builder.HasIndex(e => e.Location).HasMethod("gist");
        builder.HasIndex(e => e.ShareTokenHash).IsUnique();
        builder.HasIndex(e => e.OwnerId);
        builder.HasIndex(e => e.EndAt);
    }
}

internal sealed class EventInvitedFriendTagConfiguration : IEntityTypeConfiguration<EventInvitedFriendTag>
{
    public void Configure(EntityTypeBuilder<EventInvitedFriendTag> builder)
    {
        builder.ToTable("event_invited_friend_tags", table =>
            table.HasCheckConstraint("ck_event_invited_friend_tags_length", "char_length(normalized_tag) BETWEEN 1 AND 30"));
        builder.Property(row => row.NormalizedTag).HasMaxLength(30).IsRequired();
        builder.Property(row => row.Label).HasMaxLength(30).IsRequired();
        builder.HasIndex(row => new { row.EventId, row.NormalizedTag }).IsUnique();
        builder.HasOne<Event>()
            .WithMany()
            .HasForeignKey(row => row.EventId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

internal sealed class EventInviteConfiguration : IEntityTypeConfiguration<EventInvite>
{
    public void Configure(EntityTypeBuilder<EventInvite> builder)
    {
        builder.ToTable("event_invites");
        builder.HasIndex(invite => new { invite.EventId, invite.InviteeUserId }).IsUnique();
        builder.HasIndex(invite => invite.InviteeUserId);
    }
}
