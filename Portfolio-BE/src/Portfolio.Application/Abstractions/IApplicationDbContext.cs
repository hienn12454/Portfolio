using Microsoft.EntityFrameworkCore;
using Portfolio.Domain.Entities;

namespace Portfolio.Application.Abstractions;

public interface IApplicationDbContext
{
    DbSet<Project> Projects { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
