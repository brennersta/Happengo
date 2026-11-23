using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NodaTime;

#nullable disable

namespace Happengo.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Friendships : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "event_invited_friend_tags",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    normalized_tag = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    label = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_event_invited_friend_tags", x => x.id);
                    table.CheckConstraint("ck_event_invited_friend_tags_length", "char_length(normalized_tag) BETWEEN 1 AND 30");
                    table.ForeignKey(
                        name: "fk_event_invited_friend_tags_events_event_id",
                        column: x => x.event_id,
                        principalTable: "events",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "friend_invites",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    token_hash = table.Column<byte[]>(type: "bytea", nullable: false),
                    created_at = table.Column<Instant>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_friend_invites", x => x.user_id);
                    table.ForeignKey(
                        name: "fk_friend_invites_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "friend_tags",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    owner_id = table.Column<Guid>(type: "uuid", nullable: false),
                    friend_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    normalized_tag = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    label = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_friend_tags", x => x.id);
                    table.CheckConstraint("ck_friend_tags_distinct", "owner_id <> friend_user_id");
                    table.CheckConstraint("ck_friend_tags_length", "char_length(normalized_tag) BETWEEN 1 AND 30");
                    table.ForeignKey(
                        name: "fk_friend_tags_users_friend_user_id",
                        column: x => x.friend_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_friend_tags_users_owner_id",
                        column: x => x.owner_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "friendships",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_low_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_high_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<Instant>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_friendships", x => x.id);
                    table.CheckConstraint("ck_friendships_distinct", "user_low_id <> user_high_id");
                    table.ForeignKey(
                        name: "fk_friendships_users_user_high_id",
                        column: x => x.user_high_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_friendships_users_user_low_id",
                        column: x => x.user_low_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_event_invited_friend_tags_event_id_normalized_tag",
                table: "event_invited_friend_tags",
                columns: new[] { "event_id", "normalized_tag" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_friend_invites_token_hash",
                table: "friend_invites",
                column: "token_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_friend_tags_friend_user_id",
                table: "friend_tags",
                column: "friend_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_friend_tags_owner_id_friend_user_id",
                table: "friend_tags",
                columns: new[] { "owner_id", "friend_user_id" });

            migrationBuilder.CreateIndex(
                name: "ix_friend_tags_owner_id_friend_user_id_normalized_tag",
                table: "friend_tags",
                columns: new[] { "owner_id", "friend_user_id", "normalized_tag" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_friendships_user_high_id",
                table: "friendships",
                column: "user_high_id");

            migrationBuilder.CreateIndex(
                name: "ix_friendships_user_low_id_user_high_id",
                table: "friendships",
                columns: new[] { "user_low_id", "user_high_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "event_invited_friend_tags");

            migrationBuilder.DropTable(
                name: "friend_invites");

            migrationBuilder.DropTable(
                name: "friend_tags");

            migrationBuilder.DropTable(
                name: "friendships");
        }
    }
}
