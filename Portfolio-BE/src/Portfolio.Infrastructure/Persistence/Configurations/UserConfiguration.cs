using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Portfolio.Domain.Entities;

namespace Portfolio.Infrastructure.Persistence.Configurations;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.ClerkUserId)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.Email)
            .HasMaxLength(320)
            .IsRequired();

        builder.Property(x => x.DisplayName)
            .HasMaxLength(120);

        builder.Property(x => x.FirstName)
            .HasMaxLength(100);

        builder.Property(x => x.LastName)
            .HasMaxLength(100);

        builder.Property(x => x.ImageUrl)
            .HasMaxLength(1000);

        builder.Property(x => x.DateOfBirth)
            .HasColumnType("date");

        builder.Property(x => x.PhoneNumber)
            .HasMaxLength(30);

        builder.Property(x => x.Address)
            .HasMaxLength(300);

        builder.Property(x => x.Occupation)
            .HasMaxLength(120);

        builder.Property(x => x.Headline)
            .HasMaxLength(200);

        builder.Property(x => x.Bio)
            .HasMaxLength(4000);

        builder.Property(x => x.WebsiteUrl)
            .HasMaxLength(500);

        builder.Property(x => x.GithubUrl)
            .HasMaxLength(500);

        builder.Property(x => x.LinkedInUrl)
            .HasMaxLength(500);

        builder.Property(x => x.Company)
            .HasMaxLength(160);

        builder.Property(x => x.Education)
            .HasMaxLength(2000);

        builder.Property(x => x.SkillsSummary)
            .HasMaxLength(3000);

        builder.Property(x => x.Languages)
            .HasMaxLength(300);

        builder.Property(x => x.DesiredRole)
            .HasMaxLength(120);

        builder.Property(x => x.CoverImageUrl)
            .HasMaxLength(1000);

        builder.Property(x => x.Role)
            .HasMaxLength(20)
            .HasDefaultValue("User")
            .IsRequired();

        builder.HasIndex(x => x.ClerkUserId)
            .IsUnique();

        builder.HasIndex(x => x.Email);
    }
}
