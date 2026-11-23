using System.ComponentModel.DataAnnotations;

namespace Happengo.Api.Events.CreateEvent;

public sealed record CreateEventRequest
{
    [Required]
    public string? Title { get; init; }

    public string? Description { get; init; }

    [Required]
    public DateTimeOffset? StartAt { get; init; }

    [Required]
    public DateTimeOffset? EndAt { get; init; }

    [Required]
    public string? TimeZoneId { get; init; }

    [Required]
    public string? Address { get; init; }

    [Required]
    public double? Longitude { get; init; }

    [Required]
    public double? Latitude { get; init; }

    [Required]
    public EventVisibility? Visibility { get; init; }

    [Required]
    public ApprovalMode? ApprovalMode { get; init; }

    [Required]
    [MinLength(1)]
    public EventTag[]? Tags { get; init; }

    public string[]? InvitedFriendTags { get; init; }
}
