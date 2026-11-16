namespace Happengo.Api.Events.Probe
{
    /// <summary>
    /// Internal type used only to prove the architecture rule fails when another feature touches it.
    /// </summary>
    internal static class BoundaryProbeSecret
    {
        public static int Marker => 1;
    }
}

namespace Happengo.Api.Friends.Probe
{
    internal static class BoundaryProbeViolation
    {
        public static int Touch() => global::Happengo.Api.Events.Probe.BoundaryProbeSecret.Marker;
    }
}
