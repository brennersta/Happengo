using Microsoft.EntityFrameworkCore.Migrations;
using NodaTime;

#nullable disable

namespace Happengo.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CancelEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Instant>(
                name: "cancelled_at",
                table: "events",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "cancelled_at",
                table: "events");
        }
    }
}
