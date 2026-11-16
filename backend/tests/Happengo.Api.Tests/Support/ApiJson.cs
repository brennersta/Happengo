using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Happengo.Api.Tests.Support;

internal static class ApiJson
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    public static Task<T?> Read<T>(this HttpContent content) =>
        content.ReadFromJsonAsync<T>(Options);

    public static HttpRequestMessage Get(string url, string? subject = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, url);
        if (subject is not null)
        {
            request.Headers.Add(TestAuthHandler.HeaderName, subject);
        }

        return request;
    }
}
