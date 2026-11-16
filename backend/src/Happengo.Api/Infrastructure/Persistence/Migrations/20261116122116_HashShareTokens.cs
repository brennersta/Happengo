using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Happengo.Api.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Replaces plaintext <c>share_token</c> with <c>share_token_hash</c>.
    /// Up backfills SHA-256 with pgcrypto <c>digest(share_token, 'sha256')</c> (UTF-8 bytes of the
    /// canonical token, matching <c>ShareToken.Hash</c>) and then drops the plaintext column.
    /// Down is lossy: the hash cannot be reversed, so each row receives a new random token and
    /// previously issued links stop working. The previous column and unique index are restored,
    /// and pgcrypto is dropped only after those tokens are written.
    /// </summary>
    public partial class HashShareTokens : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:pgcrypto", ",,")
                .Annotation("Npgsql:PostgresExtension:postgis", ",,")
                .OldAnnotation("Npgsql:PostgresExtension:postgis", ",,");

            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS pgcrypto;");

            migrationBuilder.AddColumn<byte[]>(
                name: "share_token_hash",
                table: "events",
                type: "bytea",
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE events
                SET share_token_hash = digest(share_token, 'sha256');
                """);

            migrationBuilder.AlterColumn<byte[]>(
                name: "share_token_hash",
                table: "events",
                type: "bytea",
                nullable: false,
                oldClrType: typeof(byte[]),
                oldType: "bytea",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_events_share_token_hash",
                table: "events",
                column: "share_token_hash",
                unique: true);

            migrationBuilder.DropIndex(
                name: "ix_events_share_token",
                table: "events");

            migrationBuilder.DropColumn(
                name: "share_token",
                table: "events");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "share_token",
                table: "events",
                type: "character varying(22)",
                maxLength: 22,
                nullable: true);

            // Lossy. gen_random_bytes needs pgcrypto, which Up installed and this Down drops last.
            migrationBuilder.Sql(
                """
                UPDATE events
                SET share_token = translate(rtrim(encode(gen_random_bytes(16), 'base64'), '='), '+/', '-_');
                """);

            migrationBuilder.AlterColumn<string>(
                name: "share_token",
                table: "events",
                type: "character varying(22)",
                maxLength: 22,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(22)",
                oldMaxLength: 22,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_events_share_token",
                table: "events",
                column: "share_token",
                unique: true);

            migrationBuilder.DropIndex(
                name: "ix_events_share_token_hash",
                table: "events");

            migrationBuilder.DropColumn(
                name: "share_token_hash",
                table: "events");

            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:postgis", ",,")
                .OldAnnotation("Npgsql:PostgresExtension:pgcrypto", ",,")
                .OldAnnotation("Npgsql:PostgresExtension:postgis", ",,");
        }
    }
}
