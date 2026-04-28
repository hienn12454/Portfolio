using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Portfolio.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUserRoadmapPlans : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UserRoadmapPlans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Track = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Specialty = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SourceRoadmapSlug = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PlanMarkdown = table.Column<string>(type: "character varying(8000)", maxLength: 8000, nullable: false),
                    DailyTechnical = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    DailyForDate = table.Column<DateOnly>(type: "date", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserRoadmapPlans", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserRoadmapPlans_UserId_DailyForDate",
                table: "UserRoadmapPlans",
                columns: new[] { "UserId", "DailyForDate" });

            migrationBuilder.CreateIndex(
                name: "IX_UserRoadmapPlans_UserId_Specialty_CreatedAtUtc",
                table: "UserRoadmapPlans",
                columns: new[] { "UserId", "Specialty", "CreatedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserRoadmapPlans");
        }
    }
}
