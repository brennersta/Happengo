using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;
using NodaTime;

#nullable disable

namespace Happengo.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Incidents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "incidents",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    reporter_id = table.Column<Guid>(type: "uuid", nullable: false),
                    category = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    location = table.Column<Point>(type: "geometry(Point,4326)", nullable: false),
                    address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    created_at = table.Column<Instant>(type: "timestamp with time zone", nullable: false),
                    last_confirmed_at = table.Column<Instant>(type: "timestamp with time zone", nullable: false),
                    closed_at = table.Column<Instant>(type: "timestamp with time zone", nullable: true),
                    closed_by = table.Column<Guid>(type: "uuid", nullable: true),
                    close_reason = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_incidents", x => x.id);
                    table.CheckConstraint("ck_incidents_category", "category IN ('fire', 'traffic_collision', 'other')");
                    table.CheckConstraint("ck_incidents_close_reason", "close_reason IS NULL OR close_reason IN ('reporter', 'community', 'moderator')");
                    table.CheckConstraint("ck_incidents_description", "char_length(description) <= 500");
                    table.ForeignKey(
                        name: "fk_incidents_users_closed_by",
                        column: x => x.closed_by,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_incidents_users_reporter_id",
                        column: x => x.reporter_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "incident_votes",
                columns: table => new
                {
                    incident_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    vote = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    updated_at = table.Column<Instant>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_incident_votes", x => new { x.incident_id, x.user_id });
                    table.CheckConstraint("ck_incident_votes_value", "vote IN ('still_there', 'gone')");
                    table.ForeignKey(
                        name: "fk_incident_votes_incidents_incident_id",
                        column: x => x.incident_id,
                        principalTable: "incidents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_incident_votes_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_incident_votes_user_id",
                table: "incident_votes",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_incidents_closed_by",
                table: "incidents",
                column: "closed_by");

            migrationBuilder.CreateIndex(
                name: "ix_incidents_created_at",
                table: "incidents",
                column: "created_at");

            migrationBuilder.CreateIndex(
                name: "ix_incidents_location",
                table: "incidents",
                column: "location")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "ix_incidents_reporter_id",
                table: "incidents",
                column: "reporter_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "incident_votes");

            migrationBuilder.DropTable(
                name: "incidents");
        }
    }
}
