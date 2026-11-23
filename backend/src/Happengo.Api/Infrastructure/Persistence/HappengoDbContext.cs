using Microsoft.EntityFrameworkCore;
using Npgsql.EntityFrameworkCore.PostgreSQL;

namespace Happengo.Api.Infrastructure.Persistence;

public sealed class HappengoDbContext(DbContextOptions<HappengoDbContext> options) : DbContext(options)
{
    internal DbSet<Identity.User> Users => Set<Identity.User>();

    internal DbSet<Events.Event> Events => Set<Events.Event>();

    internal DbSet<Events.EventInvite> EventInvites => Set<Events.EventInvite>();

    internal DbSet<Events.EventInvitedFriendTag> EventInvitedFriendTags => Set<Events.EventInvitedFriendTag>();

    internal DbSet<Attendance.Attendance> Attendances => Set<Attendance.Attendance>();

    internal DbSet<Friends.Friendship> Friendships => Set<Friends.Friendship>();

    internal DbSet<Friends.FriendTag> FriendTags => Set<Friends.FriendTag>();

    internal DbSet<Friends.FriendInvite> FriendInvites => Set<Friends.FriendInvite>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("pgcrypto");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(HappengoDbContext).Assembly);
        HappengoRelationships.Configure(modelBuilder);
    }
}
