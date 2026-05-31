using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Portfolio.Application.Features.Premium;
using Portfolio.Application.Features.Users;

namespace Portfolio.Api.Controllers;

[ApiController]
[Route("api/premium")]
public sealed class PremiumController(
    ICurrentAppUserService currentAppUserService,
    IPremiumSubscriptionService premiumSubscriptionService) : ControllerBase
{
    public sealed record SubscribeRequest(string Plan, string? PaymentReference);
    public sealed record GrantRequest(string Plan);

    [HttpGet("plans")]
    public IActionResult GetPlans()
    {
        return Ok(premiumSubscriptionService.GetPlans());
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMyStatus(CancellationToken cancellationToken)
    {
        var appUser = await ResolveCurrentUserAsync(cancellationToken);
        if (appUser is null)
        {
            return Unauthorized(new { Message = "Unable to resolve current user." });
        }

        var status = await premiumSubscriptionService.GetStatusAsync(appUser.Id, cancellationToken);
        return Ok(status);
    }

    [Authorize]
    [HttpPost("me/subscribe")]
    public async Task<IActionResult> Subscribe([FromBody] SubscribeRequest? request, CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Plan))
        {
            return BadRequest(new { Message = "Plan is required." });
        }

        var appUser = await ResolveCurrentUserAsync(cancellationToken);
        if (appUser is null)
        {
            return Unauthorized(new { Message = "Unable to resolve current user." });
        }

        try
        {
            // Mock payment: activation is immediate. Swap PaymentMethod/reference for a real gateway later.
            var status = await premiumSubscriptionService.SubscribeOrRenewAsync(
                appUser.Id, request.Plan, "mock", request.PaymentReference, cancellationToken);
            return Ok(status);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { ex.Message });
        }
    }

    [Authorize]
    [HttpPost("me/cancel")]
    public async Task<IActionResult> Cancel(CancellationToken cancellationToken)
    {
        var appUser = await ResolveCurrentUserAsync(cancellationToken);
        if (appUser is null)
        {
            return Unauthorized(new { Message = "Unable to resolve current user." });
        }

        var status = await premiumSubscriptionService.CancelAsync(appUser.Id, cancellationToken);
        return Ok(status);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpGet("admin/subscriptions")]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var items = await premiumSubscriptionService.GetAllAsync(cancellationToken);
        return Ok(items);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPost("admin/users/{userId:guid}/grant")]
    public async Task<IActionResult> Grant(Guid userId, [FromBody] GrantRequest? request, CancellationToken cancellationToken)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Plan))
        {
            return BadRequest(new { Message = "Plan is required." });
        }

        try
        {
            var status = await premiumSubscriptionService.SubscribeOrRenewAsync(
                userId, request.Plan, "admin", $"ADMIN-{DateTime.UtcNow:yyyyMMddHHmmss}", cancellationToken);
            return Ok(status);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { ex.Message });
        }
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
