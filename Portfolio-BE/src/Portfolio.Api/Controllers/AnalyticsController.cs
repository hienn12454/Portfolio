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
    [HttpPost("page-view")]
    public async Task<IActionResult> TrackPageView(
        [FromBody] TrackPageViewRequest? request,
        CancellationToken cancellationToken)
    {
        var metrics = await GetOrCreateMetricsAsync(cancellationToken);
        metrics.TotalPageViews += 1;
        metrics.LastPageViewAtUtc = DateTime.UtcNow;

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
        var metrics = await GetOrCreateMetricsAsync(cancellationToken);
        metrics.TotalLogins += 1;
        metrics.LastLoginAtUtc = DateTime.UtcNow;

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
        var metrics = await dbContext.SiteMetrics
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAtUtc)
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

        var pageViewsByDay = await dbContext.PageViewLogs
            .AsNoTracking()
            .Where(p => p.ViewedAtUtc >= startUtc && p.ViewedAtUtc <= endUtc)
            .GroupBy(p => p.ViewedAtUtc.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var loginsByDay = await dbContext.UserLoginLogs
            .AsNoTracking()
            .Where(l => l.LoggedInAtUtc >= startUtc && l.LoggedInAtUtc <= endUtc)
            .GroupBy(l => l.LoggedInAtUtc.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var newUsersByDay = await dbContext.Users
            .AsNoTracking()
            .Where(u => u.CreatedAtUtc >= startUtc && u.CreatedAtUtc <= endUtc)
            .GroupBy(u => u.CreatedAtUtc.Date)
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

    private async Task<SiteMetric> GetOrCreateMetricsAsync(CancellationToken cancellationToken)
    {
        // Always converge on the earliest-created row so that, even if a startup race ever
        // produced duplicate metric rows, every writer accumulates onto the same canonical row
        // instead of splitting counts across rows (which would under-report totals).
        var metrics = await dbContext.SiteMetrics
            .OrderBy(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (metrics is not null)
        {
            return metrics;
        }

        metrics = new SiteMetric();
        dbContext.SiteMetrics.Add(metrics);
        return metrics;
    }
}
