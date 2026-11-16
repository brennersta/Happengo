using NetTopologySuite.Geometries;

namespace Happengo.Api.Infrastructure.Persistence;

internal static class GeoPoint
{
    /// <summary>X is longitude, Y is latitude, SRID 4326.</summary>
    public static Point FromLngLat(double longitude, double latitude) =>
        new(longitude, latitude) { SRID = 4326 };
}
