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
        });

        builder.Property(e => e.Title).HasMaxLength(200).IsRequired();
        builder.Property(e => e.Description).HasMaxLength(4000);
        builder.Property(e => e.TimeZoneId).HasMaxLength(64).IsRequired();
        builder.Property(e => e.Address).HasMaxLength(500).IsRequired();
        builder.Property(e => e.ShareToken).HasMaxLength(22).IsRequired();
        builder.Property(e => e.CoverBlobName).HasMaxLength(1024);

        builder.Property(e => e.Location)
            .HasColumnType("geometry(Point,4326)")
            .IsRequired();

        builder.Property(e => e.Visibility)
            .HasConversion(
                value => value == EventVisibility.Unlisted ? "unlisted"
                    : value == EventVisibility.FriendsOnly ? "friends_only"
                    : "public",
                value => value == "unlisted" ? EventVisibility.Unlisted
                    : value == "friends_only" ? EventVisibility.FriendsOnly
                    : EventVisibility.Public)
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(e => e.ApprovalMode)
            .HasConversion(
                value => value == ApprovalMode.Approval ? "approval" : "open",
                value => value == "approval" ? ApprovalMode.Approval : ApprovalMode.Open)
            .HasMaxLength(32)
            .IsRequired();

        builder.PrimitiveCollection(e => e.Tags)
            .HasColumnType("text[]")
            .ElementType()
            .HasConversion<string>()
            .HasMaxLength(32);

        builder.HasIndex(e => e.Location).HasMethod("gist");
        builder.HasIndex(e => e.ShareToken).IsUnique();
        builder.HasIndex(e => e.OwnerId);
        builder.HasIndex(e => e.EndAt);
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
