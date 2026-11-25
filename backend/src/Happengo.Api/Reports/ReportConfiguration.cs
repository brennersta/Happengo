using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Happengo.Api.Infrastructure.Persistence;
using NodaTime;

namespace Happengo.Api.Reports;

public sealed record ModerationReportGroup(
    ReportTargetType TargetType,
    Guid TargetId,
    int ReportCount,
    Instant LatestReportedAt,
    IReadOnlyList<ReportReason> Reasons);

public static class ReportAccess
{
    public static async Task<IReadOnlyList<ModerationReportGroup>> ModerationQueueAsync(
        HappengoDbContext db,
        CancellationToken cancellationToken)
    {
        var groups = await db.Reports.AsNoTracking()
            .GroupBy(row => new { row.TargetType, row.TargetId })
            .Select(rows => new { rows.Key.TargetType, rows.Key.TargetId, ReportCount = rows.Count(), LatestReportedAt = rows.Max(row => row.CreatedAt) })
            .ToListAsync(cancellationToken);
        var reasons = await db.Reports.AsNoTracking()
            .Select(row => new { row.TargetType, row.TargetId, row.Reason })
            .ToListAsync(cancellationToken);
        var reasonGroups = reasons.GroupBy(row => (row.TargetType, row.TargetId))
            .ToDictionary(group => group.Key, group => (IReadOnlyList<ReportReason>)group.Select(row => row.Reason).Distinct().ToArray());
        return groups.Select(row => new ModerationReportGroup(
                row.TargetType, row.TargetId, row.ReportCount, row.LatestReportedAt,
                reasonGroups.GetValueOrDefault((row.TargetType, row.TargetId), [])))
            .ToArray();
    }
}

internal sealed class ReportConfiguration : IEntityTypeConfiguration<Report>
{
    public void Configure(EntityTypeBuilder<Report> builder)
    {
        builder.ToTable("reports", table =>
        {
            table.HasCheckConstraint("ck_reports_target_type", "target_type IN ('event', 'incident')");
            table.HasCheckConstraint("ck_reports_reason", "reason IN ('inappropriate_content', 'spam_scam', 'fake_misleading', 'harassment_unsafe')");
        });
        builder.HasKey(row => row.Id);
        builder.Property(row => row.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(row => row.TargetType).HasConversion(value => TargetTypeToStored(value), value => TargetTypeFromStored(value)).HasMaxLength(16).IsRequired();
        builder.Property(row => row.Reason).HasConversion(value => ReasonToStored(value), value => ReasonFromStored(value)).HasMaxLength(32).IsRequired();
        builder.HasIndex(row => new { row.ReporterUserId, row.TargetType, row.TargetId }).IsUnique();
        builder.HasIndex(row => new { row.TargetType, row.TargetId, row.CreatedAt });
    }

    internal static string TargetTypeToStored(ReportTargetType value) => value == ReportTargetType.Event ? "event" : "incident";
    internal static ReportTargetType TargetTypeFromStored(string value) => value == "event" ? ReportTargetType.Event : ReportTargetType.Incident;
    internal static string ReasonToStored(ReportReason value) => value switch
    {
        ReportReason.InappropriateContent => "inappropriate_content",
        ReportReason.SpamScam => "spam_scam",
        ReportReason.FakeMisleading => "fake_misleading",
        ReportReason.HarassmentUnsafe => "harassment_unsafe",
        _ => throw new ArgumentOutOfRangeException(nameof(value)),
    };
    internal static ReportReason ReasonFromStored(string value) => value switch
    {
        "inappropriate_content" => ReportReason.InappropriateContent,
        "spam_scam" => ReportReason.SpamScam,
        "fake_misleading" => ReportReason.FakeMisleading,
        "harassment_unsafe" => ReportReason.HarassmentUnsafe,
        _ => throw new ArgumentOutOfRangeException(nameof(value)),
    };
}
