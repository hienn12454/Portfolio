using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Portfolio.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectDetailsAndAnalytics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CaseStudy",
                table: "Projects",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Projects",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "fullstack");

            migrationBuilder.AddColumn<string>(
                name: "Impact",
                table: "Projects",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Role",
                table: "Projects",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Stack",
                table: "Projects",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SiteMetrics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TotalPageViews = table.Column<int>(type: "integer", nullable: false),
                    TotalLogins = table.Column<int>(type: "integer", nullable: false),
                    LastPageViewAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastLoginAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SiteMetrics", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SiteMetrics");

            migrationBuilder.DropColumn(
                name: "CaseStudy",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "Impact",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "Role",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "Stack",
                table: "Projects");
        }
    }
}
