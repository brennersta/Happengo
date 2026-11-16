using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Happengo.Api.Attendance;

internal sealed class AttendanceConfiguration : IEntityTypeConfiguration<Attendance>
{
    public void Configure(EntityTypeBuilder<Attendance> builder)
    {
        builder.ToTable("attendances");

        builder.Property(row => row.Status)
            .HasConversion(
                status => status == AttendanceStatus.Attending ? "attending"
                    : status == AttendanceStatus.Requested ? "requested"
                    : status == AttendanceStatus.Rejected ? "rejected"
                    : "cancelled",
                value => value == "requested" ? AttendanceStatus.Requested
                    : value == "rejected" ? AttendanceStatus.Rejected
                    : value == "cancelled" ? AttendanceStatus.Cancelled
                    : AttendanceStatus.Attending)
            .HasMaxLength(32)
            .IsRequired();

        builder.HasIndex(row => new { row.EventId, row.UserId }).IsUnique();
        builder.HasIndex(row => row.UserId);
    }
}
