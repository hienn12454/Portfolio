using Microsoft.EntityFrameworkCore;
using Portfolio.Application.Abstractions;
using Portfolio.Domain.Entities;

namespace Portfolio.Application.Features.Users;

public interface ICurrentAppUserService
{
    Task<User?> GetByClerkIdAsync(string clerkUserId, CancellationToken cancellationToken);
    Task<User?> EnsureByClerkAsync(string clerkUserId, string? email, CancellationToken cancellationToken);
}

public sealed class CurrentAppUserService(IApplicationDbContext dbContext) : ICurrentAppUserService
{
    public async Task<User?> GetByClerkIdAsync(string clerkUserId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(clerkUserId))
        {
            return null;
        }

        return await dbContext.Users.FirstOrDefaultAsync(x => x.ClerkUserId == clerkUserId, cancellationToken);
    }

    public async Task<User?> EnsureByClerkAsync(string clerkUserId, string? email, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(clerkUserId))
        {
            return null;
        }

        var existing = await GetByClerkIdAsync(clerkUserId, cancellationToken);
        if (existing is not null)
        {
            return existing;
        }

        if (string.IsNullOrWhiteSpace(email))
        {
            return null;
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            ClerkUserId = clerkUserId,
            Email = email.Trim(),
            Role = "User",
            IsActive = true
        };

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);
        return user;
    }
}
