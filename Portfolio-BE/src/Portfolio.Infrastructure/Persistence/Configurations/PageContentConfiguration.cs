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
    }
}
