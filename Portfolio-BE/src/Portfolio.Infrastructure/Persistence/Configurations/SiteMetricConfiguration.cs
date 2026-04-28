using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Portfolio.Domain.Entities;

namespace Portfolio.Infrastructure.Persistence.Configurations;

public sealed class SiteMetricConfiguration : IEntityTypeConfiguration<SiteMetric>
{
    public void Configure(EntityTypeBuilder<SiteMetric> builder)
    {
        builder.ToTable("SiteMetrics");
        builder.HasKey(x => x.Id);
    }
}
