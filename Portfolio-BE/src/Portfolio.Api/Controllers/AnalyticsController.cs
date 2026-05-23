using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Portfolio.Application.Abstractions;
using Portfolio.Domain.Entities;
using System.Security.Claims;

namespace Portfolio.Api.Controllers;

public sealed record TrackPageViewRequest(string Path, string? Referrer);

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
        var metrics = await dbContext.SiteMetrics
            .OrderByDescending(x => x.CreatedAtUtc)
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
