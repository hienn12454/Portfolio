using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Portfolio.Application.Features.RoadmapPlans;
using Portfolio.Application.Features.Users;

namespace Portfolio.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/roadmap-plans")]
public sealed class UserRoadmapPlansController(
    ICurrentAppUserService currentAppUserService,
    IUserRoadmapPlanService userRoadmapPlanService) : ControllerBase
{
    [HttpGet("mine/today")]
    public async Task<IActionResult> GetToday(CancellationToken cancellationToken)
    {
        var appUser = await ResolveCurrentUserAsync(cancellationToken);
        if (appUser is null)
        {
            return Unauthorized(new { Message = "Unable to resolve current user." });
        }

        var todayPlan = await userRoadmapPlanService.EnsureTodayPlanAsync(appUser.Id, cancellationToken);
        return Ok(todayPlan);
    }

    [HttpGet("mine")]
    public async Task<IActionResult> GetMine(CancellationToken cancellationToken)
    {
        var appUser = await ResolveCurrentUserAsync(cancellationToken);
        if (appUser is null)
        {
            return Unauthorized(new { Message = "Unable to resolve current user." });
        }

        var plans = await userRoadmapPlanService.GetMyPlansAsync(appUser.Id, cancellationToken);
        return Ok(plans);
    }

    [HttpGet("mine/{id:guid}")]
    public async Task<IActionResult> GetMineById(Guid id, CancellationToken cancellationToken)
    {
        var appUser = await ResolveCurrentUserAsync(cancellationToken);
        if (appUser is null)
        {
            return Unauthorized(new { Message = "Unable to resolve current user." });
        }

        var plan = await userRoadmapPlanService.GetMyPlanByIdAsync(appUser.Id, id, cancellationToken);
        if (plan is null)
        {
            return NotFound();
        }

        return Ok(plan);
    }

    [HttpPost("mine/generate")]
    public async Task<IActionResult> GenerateMyPlan([FromBody] GenerateRoadmapPlanRequest? request, CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Track) || string.IsNullOrWhiteSpace(request.Specialty))
        {
            return BadRequest(new { Message = "Track and specialty are required." });
        }

        var appUser = await ResolveCurrentUserAsync(cancellationToken);
        if (appUser is null)
        {
            return Unauthorized(new { Message = "Unable to resolve current user." });
        }

        var plan = await userRoadmapPlanService.GenerateAndSaveAsync(appUser.Id, request.Track, request.Specialty, cancellationToken);
        return Ok(plan);
    }

    private async Task<Domain.Entities.User?> ResolveCurrentUserAsync(CancellationToken cancellationToken)
    {
        var clerkUserId = ResolveClerkUserId(User);
        if (string.IsNullOrWhiteSpace(clerkUserId))
        {
            return null;
        }

        var email = User.FindFirst("email")?.Value;
        return await currentAppUserService.EnsureByClerkAsync(clerkUserId, email, cancellationToken);
    }

    private static string? ResolveClerkUserId(ClaimsPrincipal user)
    {
        return user.FindFirst("sub")?.Value
            ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? user.FindFirst("user_id")?.Value;
    }
}

public sealed record GenerateRoadmapPlanRequest(string Track, string Specialty);
