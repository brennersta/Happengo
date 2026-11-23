using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using Happengo.Api.Events;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Happengo.Api.Tests.OpenApi;

public sealed class OpenApiDriftTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public OpenApiDriftTests(WebApplicationFactory<Program> factory) =>
        _factory = factory.WithWebHostBuilder(builder => builder.UseSetting("ASPNETCORE_ENVIRONMENT", "Development"));

    [Fact]
    public async Task Event_tag_vocabulary_is_a_string_enum()
    {
        var document = await LoadDocumentAsync();
        var schema = FindTagSchema(document);
        Assert.NotNull(schema);
        Assert.Equal("string", schema!["type"]?.GetValue<string>());

        var values = schema["enum"]!.AsArray().Select(node => node!.GetValue<string>()).ToHashSet(StringComparer.Ordinal);
        foreach (var tag in Enum.GetNames<EventTag>())
        {
            Assert.Contains(tag, values);
        }

        Assert.Equal(10, values.Count);

        var raw = document.ToJsonString();
        Assert.DoesNotContain("\"integer\",\"string\"", raw.Replace(" ", ""), StringComparison.Ordinal);
        Assert.DoesNotContain("\"number\",\"string\"", raw.Replace(" ", ""), StringComparison.Ordinal);

        var bbox = document["paths"]!["/v1/events"]!["get"]!["parameters"]!.AsArray()
            .Single(parameter => parameter!["name"]!.GetValue<string>() == "bbox");
        Assert.True(bbox!["required"]?.GetValue<bool>());

        var required = document["components"]!["schemas"]!["EventResponse"]!["required"]!.AsArray()
            .Select(node => node!.GetValue<string>());
        Assert.DoesNotContain("shareToken", required);
        var share = document["components"]!["schemas"]!["EventResponse"]!["properties"]!["shareToken"]!;
        Assert.Contains("null", share["type"]!.ToJsonString(), StringComparison.Ordinal);

        Assert.NotNull(document["paths"]!["/v1/events"]!["get"]!["responses"]!["429"]);
        Assert.NotNull(document["paths"]!["/v1/events/shared/{token}"]!["get"]!["responses"]!["429"]);
    }

    [Fact]
    public async Task Create_event_required_properties_are_non_nullable()
    {
        var document = await LoadDocumentAsync();
        var schema = document["components"]!["schemas"]!["CreateEventRequest"]!;
        var required = schema["required"]!.AsArray().Select(node => node!.GetValue<string>()).ToArray();
        Assert.Equal(9, required.Length);
        foreach (var name in required)
        {
            Assert.DoesNotContain("null", schema["properties"]![name]!.ToJsonString(), StringComparison.Ordinal);
        }
    }

    [Fact]
    public async Task OpenApi_document_matches_committed_contract()
    {
        var generated = await LoadDocumentAsync();
        var path = OpenApiPath();
        var update = string.Equals(Environment.GetEnvironmentVariable("UPDATE_OPENAPI"), "1", StringComparison.Ordinal);

        if (update)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            var pretty = generated.ToJsonString(new JsonSerializerOptions { WriteIndented = true }) + "\n";
            await File.WriteAllTextAsync(path, pretty);
            return;
        }

        Assert.True(File.Exists(path), $"Missing {path}. Run backend/scripts/export-openapi.sh.");
        var committed = JsonNode.Parse(await File.ReadAllTextAsync(path));
        Assert.True(
            JsonNode.DeepEquals(Canonical(generated), Canonical(committed!)),
            "api/openapi.json does not match the generated OpenAPI document. Run backend/scripts/export-openapi.sh.");
    }

    private async Task<JsonNode> LoadDocumentAsync()
    {
        var client = _factory.CreateClient();
        var document = await client.GetFromJsonAsync<JsonNode>("/openapi/v1.json");
        return document ?? throw new InvalidOperationException("OpenAPI document was empty.");
    }

    private static JsonObject? FindTagSchema(JsonNode document)
    {
        var schemas = document["components"]?["schemas"]?.AsObject();
        if (schemas is null)
        {
            return null;
        }

        foreach (var schema in schemas)
        {
            var enumValues = schema.Value?["enum"]?.AsArray();
            if (enumValues is null)
            {
                continue;
            }

            var names = enumValues.Select(node => node?.GetValue<string>()).ToHashSet(StringComparer.Ordinal);
            if (names.Contains("Music") && names.Contains("Education") && names.Contains("Nightlife"))
            {
                return schema.Value as JsonObject;
            }
        }

        return null;
    }

    private static JsonNode Canonical(JsonNode node) => node switch
    {
        JsonObject obj => new JsonObject(
            obj.OrderBy(pair => pair.Key, StringComparer.Ordinal)
                .Select(pair => new KeyValuePair<string, JsonNode?>(
                    pair.Key,
                    pair.Value is null ? null : Canonical(pair.Value)))),
        JsonArray array => new JsonArray(array.Select(item => item is null ? null : Canonical(item)).ToArray()),
        _ => JsonNode.Parse(node.ToJsonString())!,
    };

    internal static string OpenApiPath()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "backend", "Happengo.sln")))
            {
                return Path.Combine(dir.FullName, "api", "openapi.json");
            }

            dir = dir.Parent;
        }

        throw new InvalidOperationException("Could not locate api/openapi.json from the test output directory.");
    }
}
