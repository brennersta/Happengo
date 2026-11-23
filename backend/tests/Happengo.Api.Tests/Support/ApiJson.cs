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

    public static HttpRequestMessage Post(string url, object body, string? subject = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(body, options: Options),
        };
        if (subject is not null)
        {
            request.Headers.Add(TestAuthHandler.HeaderName, subject);
        }

        return request;
    }

    public static HttpRequestMessage Put(string url, object body, string? subject = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = JsonContent.Create(body, options: Options),
        };
        if (subject is not null)
        {
            request.Headers.Add(TestAuthHandler.HeaderName, subject);
        }

        return request;
    }

    public static HttpRequestMessage Patch(string url, object body, string? subject = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Patch, url)
        {
            Content = JsonContent.Create(body, options: Options),
        };
        if (subject is not null)
        {
            request.Headers.Add(TestAuthHandler.HeaderName, subject);
        }

        return request;
    }

    public static HttpRequestMessage Delete(string url, string? subject = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Delete, url);
        if (subject is not null)
        {
            request.Headers.Add(TestAuthHandler.HeaderName, subject);
        }

        return request;
    }
}
