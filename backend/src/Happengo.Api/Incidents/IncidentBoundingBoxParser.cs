using System.Globalization;

namespace Happengo.Api.Incidents;

internal readonly record struct IncidentBoundingBox(double MinLongitude, double MinLatitude, double MaxLongitude, double MaxLatitude);

internal static class IncidentBoundingBoxParser
{
    public static bool TryParse(string? text, out IncidentBoundingBox box, out string detail)
    {
        box = default;
        var parts = text?.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries) ?? [];
        if (parts.Length != 4 || !TryDouble(parts[0], out var minLng) || !TryDouble(parts[1], out var minLat)
            || !TryDouble(parts[2], out var maxLng) || !TryDouble(parts[3], out var maxLat)
            || minLng is < -180 or > 180 || maxLng is < -180 or > 180 || minLat is < -90 or > 90 || maxLat is < -90 or > 90
            || minLng >= maxLng || minLat >= maxLat)
        {
            detail = "bbox must be minLng,minLat,maxLng,maxLat with valid coordinate ranges.";
            return false;
        }
        box = new(minLng, minLat, maxLng, maxLat);
        detail = "";
        return true;
    }

    private static bool TryDouble(string text, out double value) => double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out value) && double.IsFinite(value);
}
