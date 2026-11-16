using System.Net;
using Happengo.Api.Events;
using Happengo.Api.Tests.Support;
using NodaTime;

namespace Happengo.Api.Tests.Events;

/// <summary>
/// Pins the owner allow-list for every <see cref="EventVisibility"/>.
/// <see cref="Classify"/> throws for any visibility it does not list, including a new enum member.
/// Adding a member fails this test until that member is classified here and in <see cref="OwnerVisibility"/>.
/// </summary>
public sealed class OwnerAllowListTests(ApiFactory factory) : IntegrationTest, IAsyncLifetime
{
    private readonly Dictionary<EventVisibility, Guid> _ids = [];

    public async Task InitializeAsync()
    {
        await factory.ResetAsync();
        await factory.WithDb(async db =>
        {
            var owner = EventReadTests.NewUser("owner");
            db.Users.Add(owner);
            foreach (var visibility in Enum.GetValues<EventVisibility>())
            {
                var e = EventReadTests.NewEvent(
                    owner.Id,
                    visibility.ToString(),
                    visibility,
                    TestData.Now + Duration.FromHours(1),
                    TestData.Now + Duration.FromHours(2));
                _ids[visibility] = e.Id;
                db.Events.Add(e);
            }

            await db.SaveChangesAsync();
        });
    }

    public Task DisposeAsync() => Task.CompletedTask;

    public static IEnumerable<object[]> Cases()
    {
        foreach (var visibility in Enum.GetValues<EventVisibility>())
        {
            var (onMap, byId) = Classify(visibility);
            yield return [visibility, VisibleToMatrixTests.Surface.Map, onMap];
            yield return [visibility, VisibleToMatrixTests.Surface.Direct, byId];
        }
    }

    [Theory]
    [MemberData(nameof(Cases))]
    public async Task Owner_sees_only_the_allow_listed_visibilities(EventVisibility visibility, VisibleToMatrixTests.Surface surface, bool visible)
    {
        var id = _ids[visibility];
        var client = factory.CreateClient();
        using var response = surface == VisibleToMatrixTests.Surface.Map
            ? await client.SendAsync(ApiJson.Get($"/v1/events?bbox={TestData.Bbox}", "owner"))
            : await client.SendAsync(ApiJson.Get($"/v1/events/{id}", "owner"));

        if (surface == VisibleToMatrixTests.Surface.Map)
        {
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var page = (await response.Content.Read<EventMapResponse>())!;
            Assert.Equal(visible, page.Items.Any(item => item.Id == id));
            Assert.All(page.Items, item => Assert.Null(item.ShareToken));
            return;
        }

        if (visible)
        {
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var body = (await response.Content.Read<EventResponse>())!;
            Assert.Equal(id, body.Id);
            Assert.Equal(visibility, body.Visibility);
            Assert.True(body.IsOwner);
            Assert.Null(body.ShareToken);
            return;
        }

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private static (bool OnMap, bool ById) Classify(EventVisibility visibility) => visibility switch
    {
        EventVisibility.Public => (true, true),
        EventVisibility.Unlisted => (false, true),
        EventVisibility.FriendsOnly => (true, true),
        _ => throw new InvalidOperationException(
            $"Classify {visibility} for the owner allow-list. A new visibility stays hidden until it is listed."),
    };
}
