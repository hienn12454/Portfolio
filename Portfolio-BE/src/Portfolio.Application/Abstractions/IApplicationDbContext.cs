using Microsoft.EntityFrameworkCore;
using Portfolio.Domain.Entities;

namespace Portfolio.Application.Abstractions;

public interface IApplicationDbContext
{
    DbSet<Project> Projects { get; }
    DbSet<User> Users { get; }
    DbSet<ContactInfo> ContactInfos { get; }
    DbSet<PageContent> PageContents { get; }
    DbSet<Article> Articles { get; }
    DbSet<Skill> Skills { get; }
    DbSet<SiteMetric> SiteMetrics { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
