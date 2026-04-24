using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Portfolio.Application.Abstractions;

namespace Portfolio.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(IApplicationDbContext dbContext, IConfiguration configuration) : ControllerBase
{
    [HttpGet("config")]
    public IActionResult GetAuthConfig()
    {
        return Ok(new
        {
            SignInUrl = configuration["Clerk:SignInUrl"] ?? "/sign-in",
            SignUpUrl = configuration["Clerk:SignUpUrl"] ?? "/sign-up",
            ResetPasswordUrl = configuration["Clerk:ResetPasswordUrl"] ?? "/reset-password"
        });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        var clerkUserId = User.FindFirst("sub")?.Value;
        if (string.IsNullOrWhiteSpace(clerkUserId))
        {
            return Unauthorized(new { Message = "Missing Clerk user id claim." });
        }

        var appUser = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.ClerkUserId == clerkUserId, cancellationToken);

        return Ok(new
        {
            ClerkUserId = clerkUserId,
            IsMapped = appUser is not null,
            User = appUser is null
                ? null
                : new
                {
                    appUser.Id,
                    appUser.Email,
                    appUser.FirstName,
                    appUser.LastName,
                    appUser.ImageUrl,
                    appUser.IsActive
                }
        });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpGet("admin-check")]
    public IActionResult AdminCheck()
    {
        return Ok(new { Message = "Admin access granted." });
    }
}
