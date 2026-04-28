using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Portfolio.Application.Abstractions;
using Portfolio.Domain.Entities;

namespace Portfolio.Api.Controllers;

[ApiController]
[Route("api/analytics")]
public sealed class AnalyticsController(IApplicationDbContext dbContext) : ControllerBase
{
    [HttpPost("page-view")]
    public async Task<IActionResult> TrackPageView(CancellationToken cancellationToken)
    {
        var metrics = await GetOrCreateMetricsAsync(cancellationToken);
        metrics.TotalPageViews += 1;
        metrics.LastPageViewAtUtc = DateTime.UtcNow;
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
            LastLoginAtUtc = metrics?.LastLoginAtUtc
        });
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
