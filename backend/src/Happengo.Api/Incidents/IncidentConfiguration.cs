using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Happengo.Api.Incidents;

internal sealed class IncidentConfiguration : IEntityTypeConfiguration<Incident>
{
    public void Configure(EntityTypeBuilder<Incident> builder)
    {
        builder.ToTable("incidents", table =>
        {
            table.HasCheckConstraint("ck_incidents_category", "category IN ('fire', 'traffic_collision', 'other')");
            table.HasCheckConstraint("ck_incidents_description", "char_length(description) <= 500");
            table.HasCheckConstraint("ck_incidents_close_reason", "close_reason IS NULL OR close_reason IN ('reporter', 'community', 'moderator')");
        });
        builder.HasKey(row => row.Id);
        builder.Property(row => row.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(row => row.Category)
            .HasConversion(value => ToStored(value), value => FromStored(value))
            .HasMaxLength(32).IsRequired();
        builder.Property(row => row.Description).HasMaxLength(500).IsRequired();
        builder.Property(row => row.Address).HasMaxLength(500).IsRequired();
        builder.Property(row => row.Location).HasColumnType("geometry(Point,4326)").IsRequired();
        builder.Property(row => row.CloseReason).HasMaxLength(32);
        builder.HasIndex(row => row.Location).HasMethod("gist");
        builder.HasIndex(row => row.ReporterId);
        builder.HasIndex(row => row.CreatedAt);
    }

    internal static string ToStored(IncidentCategory category) => category switch
    {
        IncidentCategory.Fire => "fire",
        IncidentCategory.TrafficCollision => "traffic_collision",
        IncidentCategory.Other => "other",
        _ => throw new ArgumentOutOfRangeException(nameof(category)),
    };

    internal static IncidentCategory FromStored(string category) => category switch
    {
        "fire" => IncidentCategory.Fire,
        "traffic_collision" => IncidentCategory.TrafficCollision,
        "other" => IncidentCategory.Other,
        _ => throw new ArgumentOutOfRangeException(nameof(category)),
    };
}

internal sealed class IncidentVoteConfiguration : IEntityTypeConfiguration<IncidentVote>
{
    public void Configure(EntityTypeBuilder<IncidentVote> builder)
    {
        builder.ToTable("incident_votes", table =>
            table.HasCheckConstraint("ck_incident_votes_value", "vote IN ('still_there', 'gone')"));
        builder.HasKey(row => new { row.IncidentId, row.UserId });
        builder.Property(row => row.Vote)
            .HasConversion(value => value == IncidentVoteValue.StillThere ? "still_there" : "gone",
                value => value == "still_there" ? IncidentVoteValue.StillThere : IncidentVoteValue.Gone)
            .HasMaxLength(16).IsRequired();
        builder.HasOne<Incident>().WithMany().HasForeignKey(row => row.IncidentId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(row => row.UserId);
    }
}
