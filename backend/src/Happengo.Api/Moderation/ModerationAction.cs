using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NodaTime;

namespace Happengo.Api.Moderation;

internal sealed class ModerationAction
{
    public Guid Id { get; set; }
    public Guid ActorUserId { get; set; }
    public string TargetType { get; set; } = "";
    public Guid TargetId { get; set; }
    public string Action { get; set; } = "";
    public string Reason { get; set; } = "";
    public Instant At { get; set; }
}

internal sealed class ModerationActionConfiguration : IEntityTypeConfiguration<ModerationAction>
{
    public void Configure(EntityTypeBuilder<ModerationAction> builder)
    {
        builder.ToTable("moderation_actions", table =>
        {
            table.HasCheckConstraint("ck_moderation_actions_target_type", "target_type IN ('event', 'incident')");
            table.HasCheckConstraint("ck_moderation_actions_action", "action IN ('hide_event', 'close_incident')");
            table.HasCheckConstraint("ck_moderation_actions_reason", "char_length(reason) BETWEEN 1 AND 500");
        });
        builder.HasKey(row => row.Id);
        builder.Property(row => row.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(row => row.TargetType).HasMaxLength(16).IsRequired();
        builder.Property(row => row.Action).HasMaxLength(32).IsRequired();
        builder.Property(row => row.Reason).HasMaxLength(500).IsRequired();
        builder.HasIndex(row => new { row.TargetType, row.TargetId, row.At });
    }
}
