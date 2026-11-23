using Microsoft.EntityFrameworkCore;
using AttendanceRow = Happengo.Api.Attendance.Attendance;

namespace Happengo.Api.Infrastructure.Persistence;

/// <summary>
/// Cross-feature foreign keys live here so a feature does not reference another feature's entity.
/// </summary>
internal static class HappengoRelationships
{
    public static void Configure(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Events.Event>()
            .HasOne<Identity.User>()
            .WithMany()
            .HasForeignKey(e => e.OwnerId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Events.EventInvite>()
            .HasOne<Events.Event>()
            .WithMany()
            .HasForeignKey(invite => invite.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Events.EventInvite>()
            .HasOne<Identity.User>()
            .WithMany()
            .HasForeignKey(invite => invite.InviteeUserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<AttendanceRow>()
            .HasOne<Events.Event>()
            .WithMany()
            .HasForeignKey(row => row.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<AttendanceRow>()
            .HasOne<Identity.User>()
            .WithMany()
            .HasForeignKey(row => row.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Friends.Friendship>()
            .HasOne<Identity.User>()
            .WithMany()
            .HasForeignKey(row => row.UserLowId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Friends.Friendship>()
            .HasOne<Identity.User>()
            .WithMany()
            .HasForeignKey(row => row.UserHighId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Friends.FriendTag>()
            .HasOne<Identity.User>()
            .WithMany()
            .HasForeignKey(row => row.OwnerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Friends.FriendTag>()
            .HasOne<Identity.User>()
            .WithMany()
            .HasForeignKey(row => row.FriendUserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Friends.FriendInvite>()
            .HasOne<Identity.User>()
            .WithMany()
            .HasForeignKey(row => row.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
