using Microsoft.EntityFrameworkCore;
using Portfolio.Application.Abstractions;
using Portfolio.Infrastructure.Persistence;

namespace Portfolio.Api.Tests;

/// <summary>Shared helpers for service-level unit tests.</summary>
internal static class TestDb
{
    public static ApplicationDbContext NewContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }
}

/// <summary>Deterministic clock for unit tests.</summary>
internal sealed class FakeClock : IDateTimeProvider
{
    public FakeClock(DateTime? utcNow = null)
    {
        UtcNow = utcNow ?? new DateTime(2026, 5, 31, 12, 0, 0, DateTimeKind.Utc);
    }

    public DateTime UtcNow { get; set; }
    public DateTime VietnamNow => UtcNow.AddHours(7);
    public DateOnly VietnamToday => DateOnly.FromDateTime(VietnamNow);
}
