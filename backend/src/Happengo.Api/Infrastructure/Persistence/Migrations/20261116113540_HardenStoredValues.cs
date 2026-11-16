using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Happengo.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class HardenStoredValues : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddCheckConstraint(
                name: "ck_events_approval_mode",
                table: "events",
                sql: "approval_mode IN ('open', 'approval')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_events_tags",
                table: "events",
                sql: "tags <@ ARRAY['Music','Sports','Food','Art','Family','Tech','Nightlife','Outdoor','Culture','Education']::text[]");

            migrationBuilder.AddCheckConstraint(
                name: "ck_events_visibility",
                table: "events",
                sql: "visibility IN ('public', 'unlisted', 'friends_only')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_attendances_status",
                table: "attendances",
                sql: "status IN ('attending', 'requested', 'rejected', 'cancelled')");

            // Initial already created this index. Recreate it idempotently here so a
            // database that applied Initial, and a fresh database, end on the same index.
            // Initial itself is left unchanged.
            migrationBuilder.Sql(
                """
                DROP INDEX IF EXISTS ix_events_location_geog;
                CREATE INDEX IF NOT EXISTS ix_events_location_geog
                ON events
                USING gist ((location::geography));
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_events_approval_mode",
                table: "events");

            migrationBuilder.DropCheckConstraint(
                name: "ck_events_tags",
                table: "events");

            migrationBuilder.DropCheckConstraint(
                name: "ck_events_visibility",
                table: "events");

            migrationBuilder.DropCheckConstraint(
                name: "ck_attendances_status",
                table: "attendances");
        }
    }
}
