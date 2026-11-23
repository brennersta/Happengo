using System.Net;
using Happengo.Api.Events;
using Happengo.Api.Infrastructure.Persistence;
using Happengo.Api.Tests.Support;
using Microsoft.EntityFrameworkCore;
using NodaTime;
using Npgsql;

namespace Happengo.Api.Tests.Events;

public sealed class ShareTokenStorageTests(ApiFactory factory) : IntegrationTest
{
    [Fact]
    public async Task Reads_look_up_the_hash_and_do_not_return_the_plaintext()
    {
        await factory.ResetAsync();
        Guid id = Guid.Empty;
        var token = "";
        await factory.WithDb(async db =>
        {
            var owner = EventReadTests.NewUser("owner");
            db.Users.Add(owner);
            var e = EventReadTests.NewEvent(
                owner.Id,
                "unlisted",
                EventVisibility.Unlisted,
                TestData.Now + Duration.FromHours(1),
                TestData.Now + Duration.FromHours(2));
            id = e.Id;
            token = EventReadTests.IssuedShareTokens[e.Id];
            db.Events.Add(e);
            await db.SaveChangesAsync();
        });

        var stored = await factory.WithDb(db =>
            db.Events.Where(row => row.Id == id).Select(row => row.ShareTokenHash).SingleAsync());
        Assert.Equal(ShareToken.Hash(token), stored);

        var columns = await factory.WithDb(db => db.Database.SqlQueryRaw<string>(
            """
            SELECT column_name AS "Value"
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'events'
            """).ToListAsync());
        Assert.Contains("share_token_hash", columns);
        Assert.DoesNotContain("share_token", columns);

        var client = factory.CreateClient();
        var shared = await client.GetAsync($"/v1/events/shared/{Uri.EscapeDataString(token)}");
        Assert.Equal(HttpStatusCode.OK, shared.StatusCode);
        var sharedBody = (await shared.Content.Read<EventResponse>())!;
        Assert.Equal(id, sharedBody.Id);
        Assert.Null(sharedBody.ShareToken);

        var owner = await client.SendAsync(ApiJson.Get($"/v1/events/{id}", "owner"));
        Assert.Equal(HttpStatusCode.OK, owner.StatusCode);
        var ownerBody = (await owner.Content.Read<EventResponse>())!;
        Assert.True(ownerBody.IsOwner);
        Assert.Null(ownerBody.ShareToken);

        var missing = await client.GetAsync($"/v1/events/shared/{Uri.EscapeDataString(ShareToken.New())}");
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
    }

    [Fact]
    public async Task Upgrade_backfills_the_hash_from_plaintext_and_down_is_lossy()
    {
        var database = "happengo_share_upgrade";
        var adminBuilder = new NpgsqlConnectionStringBuilder(factory.Database.ConnectionString);
        var upgradeBuilder = new NpgsqlConnectionStringBuilder(adminBuilder.ConnectionString)
        {
            Database = database,
        };

        await using (var admin = new NpgsqlConnection(adminBuilder.ConnectionString))
        {
            await admin.OpenAsync();
            await using var drop = new NpgsqlCommand($"DROP DATABASE IF EXISTS {database}", admin);
            await drop.ExecuteNonQueryAsync();
            await using var create = new NpgsqlCommand($"CREATE DATABASE {database}", admin);
            await create.ExecuteNonQueryAsync();
        }

        var token = ShareToken.New();
        var eventId = Guid.CreateVersion7();
        var ownerId = Guid.CreateVersion7();
        try
        {
            var options = new DbContextOptionsBuilder<HappengoDbContext>()
                .UseHappengo(upgradeBuilder.ConnectionString)
                .Options;
            await using (var db = new HappengoDbContext(options))
            {
                await db.Database.MigrateAsync("20261116113540_HardenStoredValues");
            }

            await using (var conn = new NpgsqlConnection(upgradeBuilder.ConnectionString))
            {
                await conn.OpenAsync();
                await using var insert = new NpgsqlCommand(
                    """
                    INSERT INTO users (id, issuer, subject, created_at)
                    VALUES (@id, 'https://idp.example', 'upgrade', TIMESTAMPTZ '2026-11-16 12:00:00+00');

                    INSERT INTO events (
                        id, owner_id, title, start_at, end_at, time_zone_id, location, address,
                        visibility, share_token, approval_mode, tags, created_at, updated_at)
                    VALUES (
                        @eventId, @ownerId, 'upgrade',
                        TIMESTAMPTZ '2026-11-16 13:00:00+00',
                        TIMESTAMPTZ '2026-11-16 14:00:00+00',
                        'Europe/Tallinn',
                        ST_SetSRID(ST_MakePoint(24.8, 59.45), 4326),
                        'Telliskivi 60a, Tallinn',
                        'unlisted',
                        @token,
                        'open',
                        ARRAY[]::text[],
                        TIMESTAMPTZ '2026-11-16 12:00:00+00',
                        TIMESTAMPTZ '2026-11-16 12:00:00+00');
                    """,
                    conn);
                insert.Parameters.AddWithValue("id", ownerId);
                insert.Parameters.AddWithValue("eventId", eventId);
                insert.Parameters.AddWithValue("ownerId", ownerId);
                insert.Parameters.AddWithValue("token", token);
                await insert.ExecuteNonQueryAsync();
            }

            await using (var db = new HappengoDbContext(options))
            {
                await db.Database.MigrateAsync();
                Assert.False(db.Database.HasPendingModelChanges());

                var now = Instant.FromUtc(2026, 11, 16, 13, 30);
                var found = await db.Events.VisibleByShareToken(token, now).SingleAsync();
                Assert.Equal(eventId, found.Id);
                Assert.Equal(ShareToken.Hash(token), found.ShareTokenHash);

                var sql = db.Events.VisibleByShareToken(token, now).ToQueryString();
                Assert.Contains("share_token_hash", sql, StringComparison.Ordinal);
            }

            await using (var conn = new NpgsqlConnection(upgradeBuilder.ConnectionString))
            {
                await conn.OpenAsync();
                Assert.Equal(0, await ScalarInt(conn, ColumnCountSql("share_token")));
                Assert.Equal(1, await ScalarInt(conn, ColumnCountSql("share_token_hash")));
                var index = await ScalarString(
                    conn,
                    "SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ix_events_share_token_hash'");
                Assert.Contains("UNIQUE", index, StringComparison.OrdinalIgnoreCase);
            }

            await using (var db = new HappengoDbContext(options))
            {
                await db.Database.MigrateAsync("20261116113540_HardenStoredValues");
            }

            await using (var conn = new NpgsqlConnection(upgradeBuilder.ConnectionString))
            {
                await conn.OpenAsync();
                Assert.Equal(1, await ScalarInt(conn, ColumnCountSql("share_token")));
                Assert.Equal(0, await ScalarInt(conn, ColumnCountSql("share_token_hash")));
                var restored = await ScalarString(conn, "SELECT share_token FROM events WHERE id = @id", eventId);
                Assert.Equal(22, restored.Length);
                Assert.NotEqual(token, restored);
            }
        }
        finally
        {
            NpgsqlConnection.ClearPool(new NpgsqlConnection(upgradeBuilder.ConnectionString));
            await using var admin = new NpgsqlConnection(adminBuilder.ConnectionString);
            await admin.OpenAsync();
            await using (var terminate = new NpgsqlCommand(
                """
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = @database AND pid <> pg_backend_pid()
                """,
                admin))
            {
                terminate.Parameters.AddWithValue("database", database);
                await terminate.ExecuteNonQueryAsync();
            }

            await using var drop = new NpgsqlCommand($"DROP DATABASE IF EXISTS {database}", admin);
            await drop.ExecuteNonQueryAsync();
        }
    }

    private static string ColumnCountSql(string column) =>
        $"""
        SELECT COUNT(*)::int
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'events' AND column_name = '{column}'
        """;

    private static async Task<int> ScalarInt(NpgsqlConnection conn, string sql)
    {
        await using var command = new NpgsqlCommand(sql, conn);
        return (int)(await command.ExecuteScalarAsync())!;
    }

    private static async Task<string> ScalarString(NpgsqlConnection conn, string sql, Guid? id = null)
    {
        await using var command = new NpgsqlCommand(sql, conn);
        if (id is Guid value)
        {
            command.Parameters.AddWithValue("id", value);
        }

        return (string)(await command.ExecuteScalarAsync())!;
    }
}
