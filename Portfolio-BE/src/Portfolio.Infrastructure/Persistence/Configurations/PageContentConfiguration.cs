using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Portfolio.Domain.Entities;

namespace Portfolio.Infrastructure.Persistence.Configurations;

public sealed class PageContentConfiguration : IEntityTypeConfiguration<PageContent>
{
    public void Configure(EntityTypeBuilder<PageContent> builder)
    {
        builder.ToTable("PageContents");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.HeroTitle)
            .HasMaxLength(250)
            .IsRequired();

        builder.Property(x => x.HeroDescription)
            .HasMaxLength(2000)
            .IsRequired();

        builder.Property(x => x.AboutTitle)
            .HasMaxLength(250)
            .IsRequired();

        builder.Property(x => x.AboutDescription)
            .HasMaxLength(4000)
            .IsRequired();

        builder.Property(x => x.HeroTitleColor)
            .HasMaxLength(32);

        builder.Property(x => x.HeroDescriptionColor)
            .HasMaxLength(32);

        builder.Property(x => x.HeroTypingSpeedMs)
            .HasDefaultValue(28)
            .IsRequired();

        builder.Property(x => x.AboutTitleColor)
            .HasMaxLength(32);

        builder.Property(x => x.AboutDescriptionColor)
            .HasMaxLength(32);

        builder.Property(x => x.SkillsTitleColor)
            .HasMaxLength(32);

        builder.Property(x => x.SkillsDescriptionColor)
            .HasMaxLength(32);

        builder.Property(x => x.ProjectsTitleColor)
            .HasMaxLength(32);

        builder.Property(x => x.ProjectsDescriptionColor)
            .HasMaxLength(32);

        builder.Property(x => x.ContactTitleColor)
            .HasMaxLength(32);

        builder.Property(x => x.ContactDescriptionColor)
            .HasMaxLength(32);
    }
}
