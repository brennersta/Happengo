using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Happengo.Api.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AttendanceSharing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "share_attendance_with_friends",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "share_attendance_with_friends",
                table: "users");
        }
    }
}
