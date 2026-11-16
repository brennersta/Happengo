using System.Net;
using Happengo.Api.Attendance;
using AttendanceRow = Happengo.Api.Attendance.Attendance;
using Happengo.Api.Events;
using Happengo.Api.Infrastructure;
using Happengo.Api.Tests.Support;
using Microsoft.AspNetCore.Mvc;
using NodaTime;

namespace Happengo.Api.Tests.Events;

public sealed class VisibleToMatrixTests(ApiFactory factory) : IntegrationTest, IAsyncLifetime
{
    private readonly Dictionary<(EventVisibility Visibility, Phase Phase), Event> _events = [];

    public async Task InitializeAsync()
    {
        await factory.ResetAsync();
        await factory.WithDb(async db =>
        {
            var owner = EventReadTests.NewUser("owner");
            var invited = EventReadTests.NewUser("invited");
            var other = EventReadTests.NewUser("other");
            var stranger = EventReadTests.NewUser("stranger");
            var attending = EventReadTests.NewUser("attending");
            var requested = EventReadTests.NewUser("requested");
            db.Users.AddRange(owner, invited, other, stranger, attending, requested);

            foreach (var visibility in Enum.GetValues<EventVisibility>())
            {
                foreach (var phase in Enum.GetValues<Phase>())
                {
                    var (start, end) = Window(phase);
                    var e = EventReadTests.NewEvent(owner.Id, $"{visibility}-{phase}", visibility, start, end);
                    _events[(visibility, phase)] = e;
                    db.Events.Add(e);

                    if (visibility == EventVisibility.FriendsOnly)
                    {
                        db.EventInvites.Add(new EventInvite
                        {
                            Id = Guid.CreateVersion7(),
                            EventId = e.Id,
                            InviteeUserId = invited.Id,
                            CreatedAt = TestData.Now,
                        });
                    }

                    db.Attendances.Add(new AttendanceRow
                    {
                        Id = Guid.CreateVersion7(),
                        EventId = e.Id,
                        UserId = attending.Id,
                        Status = AttendanceStatus.Attending,
                        CreatedAt = TestData.Now,
                    });
                    db.Attendances.Add(new AttendanceRow
                    {
                        Id = Guid.CreateVersion7(),
                        EventId = e.Id,
                        UserId = requested.Id,
                        Status = AttendanceStatus.Requested,
                        CreatedAt = TestData.Now,
                    });
                }
            }

            await db.SaveChangesAsync();
        });
    }

    public Task DisposeAsync() => Task.CompletedTask;

    public static IEnumerable<object[]> Cases()
    {
        foreach (var viewer in Enum.GetValues<ViewerKind>())
        {
            foreach (var visibility in Enum.GetValues<EventVisibility>())
            {
                foreach (var phase in Enum.GetValues<Phase>())
                {
                    foreach (var surface in Enum.GetValues<Surface>())
                    {
                        yield return
                        [
                            viewer,
                            visibility,
                            phase,
                            surface,
                            Expected(viewer, visibility, phase, surface),
                        ];
                    }
                }
            }
        }
    }

    [Theory]
    [MemberData(nameof(Cases))]
    public async Task VisibleTo_matrix(
        ViewerKind viewer,
        EventVisibility visibility,
        Phase phase,
        Surface surface,
        bool visible)
    {
        var e = _events[(visibility, phase)];
        var client = factory.CreateClient();
        using var response = surface == Surface.Map
            ? await client.SendAsync(ApiJson.Get($"/v1/events?bbox={TestData.Bbox}", Subject(viewer)))
            : viewer == ViewerKind.ShareTokenHolder
                ? await client.SendAsync(ApiJson.Get($"/v1/events/shared/{Uri.EscapeDataString(e.ShareToken)}"))
                : await client.SendAsync(ApiJson.Get($"/v1/events/{e.Id}", Subject(viewer)));

        if (surface == Surface.Map)
        {
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var page = (await response.Content.Read<EventMapResponse>())!;
            Assert.Equal(visible, page.Items.Any(item => item.Id == e.Id));
            return;
        }

        if (visible)
        {
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var body = (await response.Content.Read<EventResponse>())!;
            Assert.Equal(e.Id, body.Id);
            Assert.Equal(visibility, body.Visibility);
            Assert.Equal(phase == Phase.Now, body.HappeningNow);
            if (viewer == ViewerKind.Owner)
            {
                Assert.Equal(e.ShareToken, body.ShareToken);
                Assert.True(body.IsOwner);
            }
            else
            {
                Assert.Null(body.ShareToken);
            }

            return;
        }

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var problem = await response.Content.Read<ProblemDetails>();
        Assert.Equal(ProblemTypes.NotFound, problem!.Type);
    }

    /// <summary>
    /// ADR 0006: the map requires <c>now &lt; end_at</c> and never lists unlisted events.
    /// ADR 0007: direct reads allow the owner always, attendees only after the end,
    /// invitees for live friends-only, and a share token only for a live unlisted event.
    /// </summary>
    private static bool Expected(ViewerKind viewer, EventVisibility visibility, Phase phase, Surface surface)
    {
        var ended = phase == Phase.Ended;
        if (surface == Surface.Map)
        {
            if (visibility == EventVisibility.Unlisted || ended)
            {
                return false;
            }

            return visibility switch
            {
                EventVisibility.Public => true,
                EventVisibility.FriendsOnly => viewer is ViewerKind.Owner or ViewerKind.InvitedFriend,
                _ => false,
            };
        }

        if (viewer == ViewerKind.ShareTokenHolder)
        {
            return visibility == EventVisibility.Unlisted && !ended;
        }

        if (ended)
        {
            return viewer is ViewerKind.Owner or ViewerKind.Attending;
        }

        return visibility switch
        {
            EventVisibility.Public => true,
            EventVisibility.Unlisted => viewer == ViewerKind.Owner,
            EventVisibility.FriendsOnly => viewer is ViewerKind.Owner or ViewerKind.InvitedFriend,
            _ => false,
        };
    }

    private static string? Subject(ViewerKind viewer) => viewer switch
    {
        ViewerKind.Owner => "owner",
        ViewerKind.Stranger => "stranger",
        ViewerKind.InvitedFriend => "invited",
        ViewerKind.OtherFriend => "other",
        ViewerKind.Attending => "attending",
        ViewerKind.Requested => "requested",
        _ => null,
    };

    private static (Instant Start, Instant End) Window(Phase phase) => phase switch
    {
        Phase.Upcoming => (TestData.Now + Duration.FromHours(1), TestData.Now + Duration.FromHours(2)),
        Phase.Now => (TestData.Now - Duration.FromMinutes(30), TestData.Now + Duration.FromMinutes(30)),
        Phase.Ended => (TestData.Now - Duration.FromHours(2), TestData.Now),
        _ => throw new ArgumentOutOfRangeException(nameof(phase)),
    };

    public enum ViewerKind
    {
        Anonymous,
        Stranger,
        Owner,
        InvitedFriend,
        OtherFriend,
        ShareTokenHolder,
        Attending,
        Requested,
    }

    public enum Phase
    {
        Upcoming,
        Now,
        Ended,
    }

    public enum Surface
    {
        Map,
        Direct,
    }
}
