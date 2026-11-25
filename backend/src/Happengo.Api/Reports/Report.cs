using System.Text.Json.Serialization;
using NodaTime;

namespace Happengo.Api.Reports;

internal sealed class Report
{
    public Guid Id { get; set; }
    public Guid ReporterUserId { get; set; }
    public ReportTargetType TargetType { get; set; }
    public Guid TargetId { get; set; }
    public ReportReason Reason { get; set; }
    public Instant CreatedAt { get; set; }
}

public enum ReportTargetType
{
    [JsonStringEnumMemberName("event")] Event,
    [JsonStringEnumMemberName("incident")] Incident,
}

public enum ReportReason
{
    [JsonStringEnumMemberName("inappropriate_content")] InappropriateContent,
    [JsonStringEnumMemberName("spam_scam")] SpamScam,
    [JsonStringEnumMemberName("fake_misleading")] FakeMisleading,
    [JsonStringEnumMemberName("harassment_unsafe")] HarassmentUnsafe,
}
