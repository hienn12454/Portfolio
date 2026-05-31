using FluentAssertions;
using Portfolio.Application.Features.Users;
using Portfolio.Domain.Entities;
using Xunit;

namespace Portfolio.Api.Tests;

public class CurrentAppUserServiceTests
{
    [Fact]
    public async Task EnsureByClerkAsync_CreatesUser_WhenMissingWithEmail()
    {
        var db = TestDb.NewContext();
        var service = new CurrentAppUserService(db);

        var user = await service.EnsureByClerkAsync("clerk_1", "new@example.com", CancellationToken.None);

        user.Should().NotBeNull();
        user!.Email.Should().Be("new@example.com");
        user.Role.Should().Be("User");
    }

    [Fact]
    public async Task EnsureByClerkAsync_ReturnsExisting_WhenAlreadyMapped()
    {
        var db = TestDb.NewContext();
        db.Users.Add(new User { Id = Guid.NewGuid(), ClerkUserId = "clerk_2", Email = "exist@example.com", Role = "Admin", IsActive = true });
        await db.SaveChangesAsync();
        var service = new CurrentAppUserService(db);

        var user = await service.EnsureByClerkAsync("clerk_2", "ignored@example.com", CancellationToken.None);

        user.Should().NotBeNull();
        user!.Role.Should().Be("Admin");
        user.Email.Should().Be("exist@example.com");
    }

    [Fact]
    public async Task EnsureByClerkAsync_ReturnsNull_WhenNoEmailAndNotExisting()
    {
        var db = TestDb.NewContext();
        var service = new CurrentAppUserService(db);

        var user = await service.EnsureByClerkAsync("clerk_3", null, CancellationToken.None);

        user.Should().BeNull();
    }
}
