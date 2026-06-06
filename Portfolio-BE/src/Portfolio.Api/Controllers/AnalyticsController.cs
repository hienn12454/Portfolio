using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Portfolio.Application.Abstractions;
using Portfolio.Domain.Entities;
using System.Security.Claims;

namespace Portfolio.Api.Controllers;

public sealed record TrackPageViewRequest(string? Path, string? Referrer);

[ApiController]
[Route("api/analytics")]
public sealed class AnalyticsController(IApplicationDbContext dbContext) : ControllerBase
{
    private const int VietnamUtcOffsetHours = 7;

    [HttpPost("page-view")]
    public async Task<IActionResult> TrackPageView(
        [FromBody] TrackPageViewRequest? request,
        CancellationToken cancellationToken)
    {
        await BumpMetricAsync(isLogin: false, cancellationToken);

        dbContext.PageViewLogs.Add(new PageViewLog
        {
            Path = string.IsNullOrWhiteSpace(request?.Path) ? "/" : request.Path,
            Referrer = string.IsNullOrWhiteSpace(request?.Referrer) ? null : request.Referrer,
            ViewedAtUtc = DateTime.UtcNow,
        });

        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok();
    }

    [Authorize]
    [HttpPost("login")]
    public async Task<IActionResult> TrackLogin(CancellationToken cancellationToken)
    {
        await BumpMetricAsync(isLogin: true, cancellationToken);

        var clerkUserId = User.FindFirst("sub")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("user_id")?.Value;

        if (!string.IsNullOrEmpty(clerkUserId))
        {
            var user = await dbContext.Users
                .FirstOrDefaultAsync(u => u.ClerkUserId == clerkUserId, cancellationToken);

            if (user is not null)
            {
                user.LoginCount += 1;
                user.LastLoginAtUtc = DateTime.UtcNow;

                dbContext.UserLoginLogs.Add(new UserLoginLog
                {
                    UserId = user.Id,
                    ClerkUserId = clerkUserId,
                    Email = user.Email,
                    DisplayName = user.DisplayName ?? user.FirstName ?? user.Email,
                    LoggedInAtUtc = DateTime.UtcNow,
                });
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok();
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(CancellationToken cancellationToken)
    {
        // Read the same canonical (earliest-created) row that the writers accumulate onto.
        var metrics = await dbContext.SiteMetrics
            .AsNoTracking()
            .OrderBy(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
        var totalUsers = await dbContext.Users
            .AsNoTracking()
            .CountAsync(cancellationToken);

        return Ok(new
        {
            TotalPageViews = metrics?.TotalPageViews ?? 0,
            TotalLogins = metrics?.TotalLogins ?? 0,
            TotalUsers = totalUsers,
            LastPageViewAtUtc = metrics?.LastPageViewAtUtc,
            LastLoginAtUtc = metrics?.LastLoginAtUtc,
        });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpGet("users-activity")]
    public async Task<IActionResult> GetUsersActivity(CancellationToken cancellationToken)
    {
        var users = await dbContext.Users
            .AsNoTracking()
            .OrderByDescending(u => u.LastLoginAtUtc)
            .Select(u => new
            {
                u.Id,
                u.Email,
                Name = u.DisplayName ?? u.FirstName ?? u.Email,
                u.Role,
                u.LoginCount,
                u.LastLoginAtUtc,
                u.CreatedAtUtc,
                u.IsActive,
            })
            .ToListAsync(cancellationToken);

        return Ok(users);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpGet("chart-data")]
    public async Task<IActionResult> GetChartData(
        [FromQuery] DateOnly startDate,
        [FromQuery] DateOnly endDate,
        CancellationToken cancellationToken = default)
    {
        var rangeSpan = endDate.DayNumber - startDate.DayNumber;
        if (rangeSpan < 0 || rangeSpan > 366)
            return BadRequest("Date range must be between 1 and 366 days.");

        var startUtc = startDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var endUtc = endDate.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

        // Bucket events by Vietnam-local day (UTC+7) so chart days line up with the requested
        // DateOnly range and with the rest of the app, instead of grouping by raw UTC day.
        var pageViewsByDay = await dbContext.PageViewLogs
            .AsNoTracking()
            .Where(p => p.ViewedAtUtc >= startUtc && p.ViewedAtUtc <= endUtc)
            .GroupBy(p => p.ViewedAtUtc.AddHours(VietnamUtcOffsetHours).Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var loginsByDay = await dbContext.UserLoginLogs
            .AsNoTracking()
            .Where(l => l.LoggedInAtUtc >= startUtc && l.LoggedInAtUtc <= endUtc)
            .GroupBy(l => l.LoggedInAtUtc.AddHours(VietnamUtcOffsetHours).Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var newUsersByDay = await dbContext.Users
            .AsNoTracking()
            .Where(u => u.CreatedAtUtc >= startUtc && u.CreatedAtUtc <= endUtc)
            .GroupBy(u => u.CreatedAtUtc.AddHours(VietnamUtcOffsetHours).Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var pvDict = pageViewsByDay.ToDictionary(x => DateOnly.FromDateTime(x.Date), x => x.Count);
        var lgDict = loginsByDay.ToDictionary(x => DateOnly.FromDateTime(x.Date), x => x.Count);
        var nuDict = newUsersByDay.ToDictionary(x => DateOnly.FromDateTime(x.Date), x => x.Count);

        var result = Enumerable.Range(0, rangeSpan + 1)
            .Select(i => startDate.AddDays(i))
            .Select(d => new
            {
                Date = d.ToString("yyyy-MM-dd"),
                PageViews = pvDict.TryGetValue(d, out var pv) ? pv : 0,
                Logins = lgDict.TryGetValue(d, out var lg) ? lg : 0,
                NewUsers = nuDict.TryGetValue(d, out var nu) ? nu : 0,
            })
            .ToList();

        return Ok(result);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpGet("page-origins")]
    public async Task<IActionResult> GetPageOrigins(
        [FromQuery] int limit = 100,
        CancellationToken cancellationToken = default)
    {
        var recentViews = await dbContext.PageViewLogs
            .AsNoTracking()
            .OrderByDescending(p => p.ViewedAtUtc)
            .Take(limit)
            .Select(p => new { p.Path, p.Referrer, p.ViewedAtUtc })
            .ToListAsync(cancellationToken);

        var pathSummary = recentViews
            .GroupBy(p => p.Path)
            .Select(g => new { Path = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(10)
            .ToList();

        var referrerSummary = recentViews
            .GroupBy(p => string.IsNullOrEmpty(p.Referrer) ? "Direct" : p.Referrer)
            .Select(g => new { Source = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(10)
            .ToList();

        return Ok(new { recentViews, pathSummary, referrerSummary });
    }

    // Always converge on the earliest-created row so that, even if a startup race ever
    // produced duplicate metric rows, every writer accumulates onto the same canonical row
    // instead of splitting counts across rows (which would under-report totals).
    private async Task<Guid> EnsureMetricsRowAsync(CancellationToken cancellationToken)
    {
        var existingId = await dbContext.SiteMetrics
            .OrderBy(x => x.CreatedAtUtc)
            .Select(x => (Guid?)x.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (existingId is Guid id)
        {
            return id;
        }

        var metrics = new SiteMetric { Id = Guid.NewGuid() };
        dbContext.SiteMetrics.Add(metrics);
        await dbContext.SaveChangesAsync(cancellationToken);
        return metrics.Id;
    }

    private async Task BumpMetricAsync(bool isLogin, CancellationToken cancellationToken)
    {
        DateTime? now = DateTime.UtcNow;
        var metricsId = await EnsureMetricsRowAsync(cancellationToken);

        try
        {
            // Atomic DB-side increment avoids lost updates under concurrent traffic.
            if (isLogin)
            {
                await dbContext.SiteMetrics
                    .Where(m => m.Id == metricsId)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(m => m.TotalLogins, m => m.TotalLogins + 1)
                        .SetProperty(m => m.LastLoginAtUtc, now), cancellationToken);
            }
            else
            {
                await dbContext.SiteMetrics
                    .Where(m => m.Id == metricsId)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(m => m.TotalPageViews, m => m.TotalPageViews + 1)
                        .SetProperty(m => m.LastPageViewAtUtc, now), cancellationToken);
            }
        }
        catch (Exception ex) when (ex is InvalidOperationException or NotSupportedException)
        {
            // Providers without ExecuteUpdate support (e.g. EF InMemory in tests): fall back to RMW.
            var metrics = await dbContext.SiteMetrics.FirstAsync(m => m.Id == metricsId, cancellationToken);
            if (isLogin)
            {
                metrics.TotalLogins += 1;
                metrics.LastLoginAtUtc = now;
            }
            else
            {
                metrics.TotalPageViews += 1;
                metrics.LastPageViewAtUtc = now;
            }
            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
