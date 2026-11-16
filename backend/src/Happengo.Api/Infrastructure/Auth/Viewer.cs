namespace Happengo.Api.Infrastructure.Auth;

public readonly record struct Viewer(Guid? UserId)
{
    public static Viewer Anonymous => new(null);

    public bool IsAuthenticated => UserId is not null;
}

public sealed class ViewerContext
{
    public Viewer Viewer { get; private set; } = Viewer.Anonymous;

    public void SignIn(Guid userId) => Viewer = new Viewer(userId);
}
