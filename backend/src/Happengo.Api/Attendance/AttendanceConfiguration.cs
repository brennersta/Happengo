using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Happengo.Api.Attendance;

internal sealed class AttendanceConfiguration : IEntityTypeConfiguration<Attendance>
{
    public void Configure(EntityTypeBuilder<Attendance> builder)
    {
        builder.ToTable("attendances", table =>
            table.HasCheckConstraint("ck_attendances_status", StoredAttendanceStatus.Check));

        builder.Property(row => row.Status)
            .HasConversion(
                value => StoredAttendanceStatus.ToProvider(value),
                value => StoredAttendanceStatus.FromProvider(value))
            .HasMaxLength(32)
            .IsRequired();

        builder.HasIndex(row => new { row.EventId, row.UserId }).IsUnique();
        builder.HasIndex(row => row.UserId);
    }
}
