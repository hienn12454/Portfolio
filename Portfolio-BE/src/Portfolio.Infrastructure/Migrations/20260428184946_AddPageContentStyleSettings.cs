using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Portfolio.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPageContentStyleSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AboutDescriptionColor",
                table: "PageContents",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AboutTitleColor",
                table: "PageContents",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContactDescriptionColor",
                table: "PageContents",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContactTitleColor",
                table: "PageContents",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HeroDescriptionColor",
                table: "PageContents",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HeroTitleColor",
                table: "PageContents",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "HeroTypingSpeedMs",
                table: "PageContents",
                type: "integer",
                nullable: false,
                defaultValue: 28);

            migrationBuilder.AddColumn<string>(
                name: "ProjectsDescriptionColor",
                table: "PageContents",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProjectsTitleColor",
                table: "PageContents",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SkillsDescriptionColor",
                table: "PageContents",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SkillsTitleColor",
                table: "PageContents",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AboutDescriptionColor",
                table: "PageContents");

            migrationBuilder.DropColumn(
                name: "AboutTitleColor",
                table: "PageContents");

            migrationBuilder.DropColumn(
                name: "ContactDescriptionColor",
                table: "PageContents");

            migrationBuilder.DropColumn(
                name: "ContactTitleColor",
                table: "PageContents");

            migrationBuilder.DropColumn(
                name: "HeroDescriptionColor",
                table: "PageContents");

            migrationBuilder.DropColumn(
                name: "HeroTitleColor",
                table: "PageContents");

            migrationBuilder.DropColumn(
                name: "HeroTypingSpeedMs",
                table: "PageContents");

            migrationBuilder.DropColumn(
                name: "ProjectsDescriptionColor",
                table: "PageContents");

            migrationBuilder.DropColumn(
                name: "ProjectsTitleColor",
                table: "PageContents");

            migrationBuilder.DropColumn(
                name: "SkillsDescriptionColor",
                table: "PageContents");

            migrationBuilder.DropColumn(
                name: "SkillsTitleColor",
                table: "PageContents");
        }
    }
}
