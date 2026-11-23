using System.Net;
using Microsoft.AspNetCore.HttpOverrides;

namespace Happengo.Api.Infrastructure;

internal sealed record ForwardedHeaderSettings(
    bool Enabled,
    IReadOnlyList<IPAddress> KnownProxies,
    IReadOnlyList<System.Net.IPNetwork> KnownNetworks)
{
    public bool HasTrustedProxy => KnownProxies.Count > 0 || KnownNetworks.Count > 0;

    public static ForwardedHeaderSettings Read(IConfiguration configuration)
    {
        var proxies = new List<IPAddress>();
        foreach (var value in configuration.GetSection("ForwardedHeaders:KnownProxies").Get<string[]>() ?? [])
        {
            if (!IPAddress.TryParse(value, out var address))
            {
                throw new InvalidOperationException($"ForwardedHeaders:KnownProxies contains an invalid IP address: '{value}'.");
            }

            proxies.Add(address);
        }

        var networks = new List<System.Net.IPNetwork>();
        foreach (var value in configuration.GetSection("ForwardedHeaders:KnownNetworks").Get<string[]>() ?? [])
        {
            if (!System.Net.IPNetwork.TryParse(value, out var network))
            {
                throw new InvalidOperationException($"ForwardedHeaders:KnownNetworks contains an invalid network: '{value}'.");
            }

            networks.Add(network);
        }

        return new ForwardedHeaderSettings(
            configuration.GetValue<bool>("ForwardedHeaders:Enabled"),
            proxies,
            networks);
    }

    public void Configure(ForwardedHeadersOptions options)
    {
        options.ForwardedHeaders = Enabled
            ? ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
            : ForwardedHeaders.None;
        options.KnownIPNetworks.Clear();
        options.KnownProxies.Clear();

        foreach (var network in KnownNetworks)
        {
            options.KnownIPNetworks.Add(network);
        }

        foreach (var proxy in KnownProxies)
        {
            options.KnownProxies.Add(proxy);
        }
    }
}
