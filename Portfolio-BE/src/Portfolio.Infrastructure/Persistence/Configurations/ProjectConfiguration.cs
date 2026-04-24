using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Portfolio.Domain.Entities;

namespace Portfolio.Infrastructure.Persistence.Configurations;

public sealed class ProjectConfiguration : IEntityTypeConfiguration<Project>
{
    public void Configure(EntityTypeBuilder<Project> builder)
    {
        builder.ToTable("Projects");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Title)
            .HasMaxLength(150)
            .IsRequired();

        builder.Property(x => x.Slug)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(x => x.Summary)
            .HasMaxLength(1000);

        builder.Property(x => x.RepositoryUrl)
            .HasMaxLength(500);

        builder.Property(x => x.DemoUrl)
            .HasMaxLength(500);

        builder.HasIndex(x => x.Slug)
            .IsUnique();
    }
}
