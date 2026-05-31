using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Portfolio.Domain.Entities;

namespace Portfolio.Infrastructure.Persistence.Configurations;

public sealed class PremiumSubscriptionConfiguration : IEntityTypeConfiguration<PremiumSubscription>
{
    public void Configure(EntityTypeBuilder<PremiumSubscription> builder)
    {
        builder.ToTable("PremiumSubscriptions");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.UserId)
            .IsRequired();

        builder.Property(x => x.Plan)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x => x.Status)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x => x.StartedAtUtc)
            .IsRequired();

        builder.Property(x => x.ExpiresAtUtc)
            .IsRequired();

        builder.Property(x => x.Currency)
            .HasMaxLength(3)
            .IsRequired();

        builder.Property(x => x.PaymentMethod)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(x => x.PaymentReference)
            .HasMaxLength(200);

        builder.HasIndex(x => x.UserId);
        builder.HasIndex(x => new { x.UserId, x.Status });
    }
}
