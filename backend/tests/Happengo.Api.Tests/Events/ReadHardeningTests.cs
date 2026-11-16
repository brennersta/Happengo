using System.Data.Common;
using System.Net;
using Happengo.Api.Attendance;
using Happengo.Api.Events;
using Happengo.Api.Infrastructure.Auth;
using Happengo.Api.Tests.Support;
using Microsoft.EntityFrameworkCore;
using NodaTime;
using AttendanceRow = Happengo.Api.Attendance.Attendance;

namespace Happengo.Api.Tests.Events;

public sealed class ReadHardeningTests(ApiFactory factory) : IntegrationTest
{
    [Fact]
    public async Task Map_scope_excludes_ended_events_for_the_owner_and_attendees()
    {
        await factory.ResetAsync();
        var now = TestData.Now;
        Guid ownerId = Guid.Empty;
        Guid attendeeId = Guid.Empty;
        Guid endedOwned = Guid.Empty;
        Guid endedAttended = Guid.Empty;
        Guid live = Guid.Empty;

        await factory.WithDb(async db =>
        {
            var owner = EventReadTests.NewUser("owner");
            var attendee = EventReadTests.NewUser("attending");
            ownerId = owner.Id;
            attendeeId = attendee.Id;
            db.Users.AddRange(owner, attendee);

            var ownedEnded = EventReadTests.NewEvent(
                owner.Id,
                "owned-ended",
                EventVisibility.Public,
                now - Duration.FromHours(2),
                now);
            var attendedEnded = EventReadTests.NewEvent(
                owner.Id,
                "attended-ended",
                EventVisibility.FriendsOnly,
                now - Duration.FromHours(3),
                now - Duration.FromMinutes(1));
            var liveEvent = EventReadTests.NewEvent(
                owner.Id,
                "live",
                EventVisibility.Public,
                now - Duration.FromMinutes(5),
                now + Duration.FromHours(1));
            endedOwned = ownedEnded.Id;
            endedAttended = attendedEnded.Id;
            live = liveEvent.Id;
            db.Events.AddRange(ownedEnded, attendedEnded, liveEvent);
            db.Attendances.Add(new AttendanceRow
            {
                Id = Guid.CreateVersion7(),
                EventId = attendedEnded.Id,
                UserId = attendee.Id,
                Status = AttendanceStatus.Attending,
                CreatedAt = now,
            });
            await db.SaveChangesAsync();
        });

        var ownerIds = await factory.WithDb(db =>
            db.Events.VisibleTo(db, new Viewer(ownerId), now, EventReadScope.Map)
                .Select(e => e.Id)
                .ToListAsync());
        var attendeeIds = await factory.WithDb(db =>
            db.Events.VisibleTo(db, new Viewer(attendeeId), now, EventReadScope.Map)
                .Select(e => e.Id)
                .ToListAsync());

        Assert.Contains(live, ownerIds);
        Assert.DoesNotContain(endedOwned, ownerIds);
        Assert.DoesNotContain(endedAttended, ownerIds);
        Assert.Contains(live, attendeeIds);
        Assert.DoesNotContain(endedAttended, attendeeIds);
        Assert.DoesNotContain(endedOwned, attendeeIds);
    }

    [Fact]
    public async Task Unknown_stored_visibility_fails_the_read_instead_of_leaking()
    {
        await factory.ResetAsync();
        var id = await factory.WithDb(async db =>
        {
            var owner = EventReadTests.NewUser("owner");
            db.Users.Add(owner);
            var e = EventReadTests.NewEvent(
                owner.Id,
                "bad-visibility",
                EventVisibility.Public,
                TestData.Now + Duration.FromHours(1),
                TestData.Now + Duration.FromHours(2));
            db.Events.Add(e);
            await db.SaveChangesAsync();
            return e.Id;
        });

        await factory.WithDb(db => db.Database.ExecuteSqlRawAsync(
            "ALTER TABLE events DROP CONSTRAINT ck_events_visibility"));
        try
        {
            await factory.WithDb(db => db.Database.ExecuteSqlRawAsync(
                "UPDATE events SET visibility = 'private' WHERE id = {0}",
                id));

            var response = await factory.CreateClient().SendAsync(ApiJson.Get($"/v1/events/{id}", "owner"));
            Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
            var body = await response.Content.ReadAsStringAsync();
            Assert.DoesNotContain("bad-visibility", body, StringComparison.Ordinal);

            var map = await factory.CreateClient().SendAsync(ApiJson.Get($"/v1/events?bbox={TestData.Bbox}"));
            var page = await map.Content.Read<EventMapResponse>();
            Assert.DoesNotContain(page!.Items, item => item.Id == id);
        }
        finally
        {
            await factory.WithDb(async db =>
            {
                await db.Database.ExecuteSqlRawAsync("DELETE FROM events WHERE id = {0}", id);
                await db.Database.ExecuteSqlRawAsync(
                    "ALTER TABLE events ADD CONSTRAINT ck_events_visibility CHECK (visibility IN ('public', 'unlisted', 'friends_only'))");
            });
        }
    }

    [Fact]
    public async Task Unknown_stored_status_does_not_grant_past_access_and_cannot_be_read()
    {
        await factory.ResetAsync();
        Guid eventId = Guid.Empty;
        Guid userId = Guid.Empty;
        await factory.WithDb(async db =>
        {
            var owner = EventReadTests.NewUser("owner");
            var stranger = EventReadTests.NewUser("stranger");
            userId = stranger.Id;
            db.Users.AddRange(owner, stranger);
            var e = EventReadTests.NewEvent(
                owner.Id,
                "ended",
                EventVisibility.Public,
                TestData.Now - Duration.FromHours(2),
                TestData.Now);
            eventId = e.Id;
            db.Events.Add(e);
            db.Attendances.Add(new AttendanceRow
            {
                Id = Guid.CreateVersion7(),
                EventId = e.Id,
                UserId = stranger.Id,
                Status = AttendanceStatus.Attending,
                CreatedAt = TestData.Now,
            });
            await db.SaveChangesAsync();
        });

        await factory.WithDb(db => db.Database.ExecuteSqlRawAsync(
            "ALTER TABLE attendances DROP CONSTRAINT ck_attendances_status"));
        try
        {
            await factory.WithDb(db => db.Database.ExecuteSqlRawAsync(
                "UPDATE attendances SET status = 'canceled' WHERE user_id = {0}",
                userId));

            var response = await factory.CreateClient().SendAsync(ApiJson.Get($"/v1/events/{eventId}", "stranger"));
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

            await factory.WithDb(async db =>
            {
                var error = await Assert.ThrowsAsync<InvalidOperationException>(() =>
                    db.Attendances.Where(row => row.UserId == userId).ToListAsync());
                Assert.Contains("canceled", error.Message, StringComparison.Ordinal);
            });
        }
        finally
        {
            await factory.WithDb(async db =>
            {
                await db.Database.ExecuteSqlRawAsync("DELETE FROM attendances WHERE user_id = {0}", userId);
                await db.Database.ExecuteSqlRawAsync(
                    "ALTER TABLE attendances ADD CONSTRAINT ck_attendances_status CHECK (status IN ('attending', 'requested', 'rejected', 'cancelled'))");
            });
        }
    }

    [Fact]
    public async Task Check_constraints_reject_values_outside_the_vocabulary()
    {
        await factory.ResetAsync();
        var id = await factory.WithDb(async db =>
        {
            var owner = EventReadTests.NewUser("owner");
            db.Users.Add(owner);
            var e = EventReadTests.NewEvent(
                owner.Id,
                "constrained",
                EventVisibility.Public,
                TestData.Now + Duration.FromHours(1),
                TestData.Now + Duration.FromHours(2));
            db.Events.Add(e);
            await db.SaveChangesAsync();
            return e.Id;
        });

        await Assert.ThrowsAnyAsync<DbException>(() => factory.WithDb(db =>
            db.Database.ExecuteSqlRawAsync(
                "UPDATE events SET visibility = 'private' WHERE id = {0}",
                id)));
        await Assert.ThrowsAnyAsync<DbException>(() => factory.WithDb(db =>
            db.Database.ExecuteSqlRawAsync(
                "UPDATE events SET tags = ARRAY['Party']::text[] WHERE id = {0}",
                id)));
    }
}
