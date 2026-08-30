using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Portfolio.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCvProfileEnhancements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Template",
                table: "CvProfiles",
                type: "text",
                nullable: false,
                defaultValue: "classic");

            migrationBuilder.AddColumn<string>(
                name: "SectionOrderJson",
                table: "CvProfiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ViewCount",
                table: "CvProfiles",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Template",
                table: "CvProfiles");

            migrationBuilder.DropColumn(
                name: "SectionOrderJson",
                table: "CvProfiles");

            migrationBuilder.DropColumn(
                name: "ViewCount",
                table: "CvProfiles");
        }
    }
}
