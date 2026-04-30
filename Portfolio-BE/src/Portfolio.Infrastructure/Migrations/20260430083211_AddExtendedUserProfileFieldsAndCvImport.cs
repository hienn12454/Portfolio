using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Portfolio.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddExtendedUserProfileFieldsAndCvImport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Bio",
                table: "Users",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Company",
                table: "Users",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CoverImageUrl",
                table: "Users",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DesiredRole",
                table: "Users",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Education",
                table: "Users",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GithubUrl",
                table: "Users",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Headline",
                table: "Users",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Languages",
                table: "Users",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LinkedInUrl",
                table: "Users",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SkillsSummary",
                table: "Users",
                type: "character varying(3000)",
                maxLength: 3000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WebsiteUrl",
                table: "Users",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "YearsOfExperience",
                table: "Users",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Bio",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Company",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CoverImageUrl",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "DesiredRole",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Education",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "GithubUrl",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Headline",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Languages",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "LinkedInUrl",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "SkillsSummary",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "WebsiteUrl",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "YearsOfExperience",
                table: "Users");
        }
    }
}
