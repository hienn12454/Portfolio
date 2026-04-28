using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Portfolio.Domain.Entities;

namespace Portfolio.Infrastructure.Persistence.Configurations;

public sealed class UserRoadmapPlanConfiguration : IEntityTypeConfiguration<UserRoadmapPlan>
{
    public void Configure(EntityTypeBuilder<UserRoadmapPlan> builder)
    {
        builder.ToTable("UserRoadmapPlans");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.UserId)
            .IsRequired();

        builder.Property(x => x.Track)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(x => x.Specialty)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.SourceRoadmapSlug)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.PlanMarkdown)
            .HasMaxLength(8000)
            .IsRequired();

        builder.Property(x => x.DailyTechnical)
            .HasMaxLength(300)
            .IsRequired();

        builder.Property(x => x.DailyForDate)
            .HasColumnType("date");

        builder.HasIndex(x => new { x.UserId, x.Specialty, x.CreatedAtUtc });
        builder.HasIndex(x => new { x.UserId, x.DailyForDate });
    }
}
