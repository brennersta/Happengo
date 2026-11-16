using System.Globalization;

namespace Happengo.Api.Events;

internal readonly record struct BoundingBox(
    double MinLongitude,
    double MinLatitude,
    double MaxLongitude,
    double MaxLatitude);

internal static class BoundingBoxParser
{
    public static bool TryParse(string? text, out BoundingBox box, out string detail)
    {
        box = default;
        if (string.IsNullOrWhiteSpace(text))
        {
            detail = "Query parameter bbox is required: minLng,minLat,maxLng,maxLat.";
            return false;
        }

        var parts = text.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 4
            || !TryDouble(parts[0], out var minLng)
            || !TryDouble(parts[1], out var minLat)
            || !TryDouble(parts[2], out var maxLng)
            || !TryDouble(parts[3], out var maxLat))
        {
            detail = "bbox must be four comma-separated numbers: minLng,minLat,maxLng,maxLat.";
            return false;
        }

        if (minLat is < -90 or > 90 || maxLat is < -90 or > 90)
        {
            detail = "Latitude must be between -90 and 90.";
            return false;
        }

        if (minLng is < -180 or > 180 || maxLng is < -180 or > 180)
        {
            detail = "Longitude must be between -180 and 180.";
            return false;
        }

        if (minLng >= maxLng || minLat >= maxLat)
        {
            detail = "bbox must be non-empty, with minLng < maxLng and minLat < maxLat. A viewport that crosses the antimeridian is not supported.";
            return false;
        }

        box = new BoundingBox(minLng, minLat, maxLng, maxLat);
        detail = "";
        return true;
    }

    private static bool TryDouble(string text, out double value) =>
        double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out value)
        && double.IsFinite(value);
}
