namespace Happengo.Api.Events;

internal static class StoredVisibility
{
    public const string Check = "visibility IN ('public', 'unlisted', 'friends_only')";

    public static string ToProvider(EventVisibility value) => value switch
    {
        EventVisibility.Public => "public",
        EventVisibility.Unlisted => "unlisted",
        EventVisibility.FriendsOnly => "friends_only",
        _ => throw new InvalidOperationException($"Unknown visibility '{value}'."),
    };

    public static EventVisibility FromProvider(string value) => value switch
    {
        "public" => EventVisibility.Public,
        "unlisted" => EventVisibility.Unlisted,
        "friends_only" => EventVisibility.FriendsOnly,
        _ => throw new InvalidOperationException($"Unknown stored visibility '{value}'."),
    };
}

internal static class StoredApprovalMode
{
    public const string Check = "approval_mode IN ('open', 'approval')";

    public static string ToProvider(ApprovalMode value) => value switch
    {
        ApprovalMode.Open => "open",
        ApprovalMode.Approval => "approval",
        _ => throw new InvalidOperationException($"Unknown approval mode '{value}'."),
    };

    public static ApprovalMode FromProvider(string value) => value switch
    {
        "open" => ApprovalMode.Open,
        "approval" => ApprovalMode.Approval,
        _ => throw new InvalidOperationException($"Unknown stored approval mode '{value}'."),
    };
}

internal static class StoredTags
{
    public const string AllowedList =
        "'Music','Sports','Food','Art','Family','Tech','Nightlife','Outdoor','Culture','Education'";

    /// <summary>
    /// Every element of the text[] must be one of the ten tags. An empty array is allowed.
    /// PostgreSQL's contained-by operator is the check; a row with any other element is rejected.
    /// </summary>
    public const string Check =
        "tags <@ ARRAY[" + AllowedList + "]::text[]";
}
