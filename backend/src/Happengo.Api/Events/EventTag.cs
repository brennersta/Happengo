namespace Happengo.Api.Events;

/// <summary>
/// Fixed tag vocabulary (ADR 0003). Serialized as these names so OpenAPI emits a string enum.
/// </summary>
public enum EventTag
{
    Music,
    Sports,
    Food,
    Art,
    Family,
    Tech,
    Nightlife,
    Outdoor,
    Culture,
    Education,
}
