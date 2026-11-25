using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NodaTime;

#nullable disable

namespace Happengo.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ReportsModeration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_moderator",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Instant>(
                name: "hidden_at",
                table: "events",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "hide_reason",
                table: "events",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "moderation_actions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    target_type = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    target_id = table.Column<Guid>(type: "uuid", nullable: false),
                    action = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    at = table.Column<Instant>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_moderation_actions", x => x.id);
                    table.CheckConstraint("ck_moderation_actions_action", "action IN ('hide_event', 'close_incident')");
                    table.CheckConstraint("ck_moderation_actions_reason", "char_length(reason) BETWEEN 1 AND 500");
                    table.CheckConstraint("ck_moderation_actions_target_type", "target_type IN ('event', 'incident')");
                    table.ForeignKey(
                        name: "fk_moderation_actions_users_actor_user_id",
                        column: x => x.actor_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "reports",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    reporter_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    target_type = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    target_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reason = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    created_at = table.Column<Instant>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_reports", x => x.id);
                    table.CheckConstraint("ck_reports_reason", "reason IN ('inappropriate_content', 'spam_scam', 'fake_misleading', 'harassment_unsafe')");
                    table.CheckConstraint("ck_reports_target_type", "target_type IN ('event', 'incident')");
                    table.ForeignKey(
                        name: "fk_reports_users_reporter_user_id",
                        column: x => x.reporter_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.AddCheckConstraint(
                name: "ck_events_hide_reason",
                table: "events",
                sql: "hide_reason IS NULL OR char_length(hide_reason) BETWEEN 1 AND 500");

            migrationBuilder.CreateIndex(
                name: "ix_moderation_actions_actor_user_id",
                table: "moderation_actions",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_moderation_actions_target_type_target_id_at",
                table: "moderation_actions",
                columns: new[] { "target_type", "target_id", "at" });

            migrationBuilder.CreateIndex(
                name: "ix_reports_reporter_user_id_target_type_target_id",
                table: "reports",
                columns: new[] { "reporter_user_id", "target_type", "target_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_reports_target_type_target_id_created_at",
                table: "reports",
                columns: new[] { "target_type", "target_id", "created_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "moderation_actions");

            migrationBuilder.DropTable(
                name: "reports");

            migrationBuilder.DropCheckConstraint(
                name: "ck_events_hide_reason",
                table: "events");

            migrationBuilder.DropColumn(
                name: "is_moderator",
                table: "users");

            migrationBuilder.DropColumn(
                name: "hidden_at",
                table: "events");

            migrationBuilder.DropColumn(
                name: "hide_reason",
                table: "events");
        }
    }
}
