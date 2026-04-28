using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Portfolio.Application.Abstractions;

namespace Portfolio.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(IApplicationDbContext dbContext, IConfiguration configuration) : ControllerBase
{
    public sealed record UpdateMyProfileRequest(
        string? DisplayName,
        DateOnly? DateOfBirth,
        string? PhoneNumber,
        string? Address,
        string? Occupation);

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

        var email = User.FindFirst("email")?.Value;
        var firstName = User.FindFirst("given_name")?.Value;
        var lastName = User.FindFirst("family_name")?.Value;
        var imageUrl = User.FindFirst("picture")?.Value;
        var username = User.FindFirst("username")?.Value ?? User.FindFirst("preferred_username")?.Value;

        var appUser = await dbContext.Users.FirstOrDefaultAsync(x => x.ClerkUserId == clerkUserId, cancellationToken);
        if (appUser is null && !string.IsNullOrWhiteSpace(email))
        {
            appUser = new Domain.Entities.User
            {
                ClerkUserId = clerkUserId,
                Email = email.Trim(),
                FirstName = Normalize(firstName),
                LastName = Normalize(lastName),
                ImageUrl = Normalize(imageUrl),
                Role = ResolveRole(clerkUserId, username),
                IsActive = true
            };
            dbContext.Users.Add(appUser);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        else if (appUser is not null)
        {
            // Keep local user synced even if webhook delivery is delayed.
            var shouldSave = false;
            if (!string.IsNullOrWhiteSpace(email) && !string.Equals(appUser.Email, email, StringComparison.OrdinalIgnoreCase))
            {
                appUser.Email = email.Trim();
                shouldSave = true;
            }

            var resolvedRole = ResolveRole(clerkUserId, username);
            if (!string.Equals(appUser.Role, resolvedRole, StringComparison.Ordinal))
            {
                appUser.Role = resolvedRole;
                shouldSave = true;
            }

            if (shouldSave)
            {
                await dbContext.SaveChangesAsync(cancellationToken);
            }
        }

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
                    appUser.DisplayName,
                    appUser.FirstName,
                    appUser.LastName,
                    appUser.ImageUrl,
                    appUser.DateOfBirth,
                    appUser.PhoneNumber,
                    appUser.Address,
                    appUser.Occupation,
                    appUser.Role,
                    appUser.IsActive
                }
        });
    }

    [Authorize]
    [HttpPut("me/profile")]
    public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateMyProfileRequest request, CancellationToken cancellationToken)
    {
        var clerkUserId = User.FindFirst("sub")?.Value;
        if (string.IsNullOrWhiteSpace(clerkUserId))
        {
            return Unauthorized(new { Message = "Missing Clerk user id claim." });
        }

        var appUser = await dbContext.Users.FirstOrDefaultAsync(x => x.ClerkUserId == clerkUserId, cancellationToken);
        if (appUser is null)
        {
            var email = User.FindFirst("email")?.Value;
            if (string.IsNullOrWhiteSpace(email))
            {
                return BadRequest(new { Message = "Missing email claim for user bootstrap." });
            }

            appUser = new Domain.Entities.User
            {
                ClerkUserId = clerkUserId,
                Email = email,
                Role = ResolveRole(clerkUserId, User.FindFirst("username")?.Value ?? User.FindFirst("preferred_username")?.Value),
                IsActive = true
            };
            dbContext.Users.Add(appUser);
        }

        appUser.DisplayName = Normalize(request.DisplayName);
        appUser.DateOfBirth = request.DateOfBirth;
        appUser.PhoneNumber = Normalize(request.PhoneNumber);
        appUser.Address = Normalize(request.Address);
        appUser.Occupation = Normalize(request.Occupation);

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            appUser.Id,
            appUser.Email,
            appUser.DisplayName,
            appUser.FirstName,
            appUser.LastName,
            appUser.ImageUrl,
            appUser.DateOfBirth,
            appUser.PhoneNumber,
            appUser.Address,
            appUser.Occupation,
            appUser.Role,
            appUser.IsActive
        });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpGet("admin-check")]
    public IActionResult AdminCheck()
    {
        return Ok(new { Message = "Admin access granted." });
    }

    private static string? Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }

    private string ResolveRole(string clerkUserId, string? username)
    {
        var adminIds = configuration["Clerk:AdminClerkUserIds"];
        if (!string.IsNullOrWhiteSpace(adminIds))
        {
            var isConfiguredAdmin = adminIds
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Any(x => string.Equals(x, clerkUserId, StringComparison.Ordinal));
            if (isConfiguredAdmin)
            {
                return "Admin";
            }
        }

        var adminUsernames = configuration["Clerk:AdminUsernames"] ?? "admin";
        if (!string.IsNullOrWhiteSpace(username))
        {
            var isAdminUsername = adminUsernames
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Any(x => string.Equals(x, username, StringComparison.OrdinalIgnoreCase));
            if (isAdminUsername)
            {
                return "Admin";
            }
        }

        return "User";
    }
}
