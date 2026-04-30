using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Portfolio.Application.Abstractions;
using Portfolio.Application.Features.Users;

namespace Portfolio.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    IApplicationDbContext dbContext,
    IConfiguration configuration,
    ICurrentAppUserService currentAppUserService,
    IOpenRouterClient openRouterClient) : ControllerBase
{
    public sealed record UpdateMyProfileRequest(
        string? DisplayName,
        DateOnly? DateOfBirth,
        string? PhoneNumber,
        string? Address,
        string? Occupation,
        string? Headline,
        string? Bio,
        string? WebsiteUrl,
        string? GithubUrl,
        string? LinkedInUrl,
        string? Company,
        int? YearsOfExperience,
        string? Education,
        string? SkillsSummary,
        string? Languages,
        string? DesiredRole,
        string? CoverImageUrl);

    public sealed record ImportCvImageRequest(string ImageBase64, string? FileName);

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
        var clerkUserId = ResolveClerkUserId(User);
        if (string.IsNullOrWhiteSpace(clerkUserId))
        {
            return Unauthorized(new { Message = "Missing Clerk user id claim." });
        }

        var email = User.FindFirst("email")?.Value;
        var firstName = User.FindFirst("given_name")?.Value;
        var lastName = User.FindFirst("family_name")?.Value;
        var imageUrl = User.FindFirst("picture")?.Value;
        var username = User.FindFirst("username")?.Value ?? User.FindFirst("preferred_username")?.Value;

        var appUser = await currentAppUserService.GetByClerkIdAsync(clerkUserId, cancellationToken);
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
            User = appUser is null ? null : MapUserResponse(appUser)
        });
    }

    [Authorize]
    [HttpPut("me/profile")]
    public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateMyProfileRequest request, CancellationToken cancellationToken)
    {
        var clerkUserId = ResolveClerkUserId(User);
        if (string.IsNullOrWhiteSpace(clerkUserId))
        {
            return Unauthorized(new { Message = "Missing Clerk user id claim." });
        }

        var email = User.FindFirst("email")?.Value;
        var appUser = await currentAppUserService.EnsureByClerkAsync(clerkUserId, email, cancellationToken);
        if (appUser is null)
        {
            return BadRequest(new { Message = "Missing email claim for user bootstrap." });
        }

        var username = User.FindFirst("username")?.Value ?? User.FindFirst("preferred_username")?.Value;
        var resolvedRole = ResolveRole(clerkUserId, username);
        if (!string.Equals(appUser.Role, resolvedRole, StringComparison.Ordinal))
        {
            appUser.Role = resolvedRole;
        }

        appUser.DisplayName = Normalize(request.DisplayName);
        appUser.DateOfBirth = request.DateOfBirth;
        appUser.PhoneNumber = Normalize(request.PhoneNumber);
        appUser.Address = Normalize(request.Address);
        appUser.Occupation = Normalize(request.Occupation);
        appUser.Headline = Normalize(request.Headline);
        appUser.Bio = Normalize(request.Bio);
        appUser.WebsiteUrl = Normalize(request.WebsiteUrl);
        appUser.GithubUrl = Normalize(request.GithubUrl);
        appUser.LinkedInUrl = Normalize(request.LinkedInUrl);
        appUser.Company = Normalize(request.Company);
        appUser.YearsOfExperience = request.YearsOfExperience;
        appUser.Education = Normalize(request.Education);
        appUser.SkillsSummary = Normalize(request.SkillsSummary);
        appUser.Languages = Normalize(request.Languages);
        appUser.DesiredRole = Normalize(request.DesiredRole);
        appUser.CoverImageUrl = Normalize(request.CoverImageUrl);

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(MapUserResponse(appUser));
    }

    [Authorize]
    [HttpPost("me/profile/import-cv")]
    public async Task<IActionResult> ImportMyCv([FromBody] ImportCvImageRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.ImageBase64))
        {
            return BadRequest(new { Message = "ImageBase64 is required." });
        }

        var clerkUserId = ResolveClerkUserId(User);
        if (string.IsNullOrWhiteSpace(clerkUserId))
        {
            return Unauthorized(new { Message = "Missing Clerk user id claim." });
        }

        var appUser = await dbContext.Users.FirstOrDefaultAsync(u => u.ClerkUserId == clerkUserId, cancellationToken);
        if (appUser is null)
        {
            return NotFound(new { Message = "User profile not found." });
        }

        var parsed = await openRouterClient.ParseCvImageAsync(request.ImageBase64, request.FileName, cancellationToken);
        if (parsed is null)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { Message = "CV parsing failed. Please try another image." });
        }

        ApplyCvParseToUser(appUser, parsed);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { User = MapUserResponse(appUser), Parsed = parsed });
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPost("users/{userId:guid}/profile/import-cv")]
    public async Task<IActionResult> ImportCvForUser(Guid userId, [FromBody] ImportCvImageRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.ImageBase64))
        {
            return BadRequest(new { Message = "ImageBase64 is required." });
        }

        var appUser = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (appUser is null)
        {
            return NotFound(new { Message = "Target user not found." });
        }

        var parsed = await openRouterClient.ParseCvImageAsync(request.ImageBase64, request.FileName, cancellationToken);
        if (parsed is null)
        {
            return StatusCode(StatusCodes.Status502BadGateway, new { Message = "CV parsing failed. Please try another image." });
        }

        ApplyCvParseToUser(appUser, parsed);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { User = MapUserResponse(appUser), Parsed = parsed });
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

    private static object MapUserResponse(Domain.Entities.User appUser)
    {
        return new
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
            appUser.Headline,
            appUser.Bio,
            appUser.WebsiteUrl,
            appUser.GithubUrl,
            appUser.LinkedInUrl,
            appUser.Company,
            appUser.YearsOfExperience,
            appUser.Education,
            appUser.SkillsSummary,
            appUser.Languages,
            appUser.DesiredRole,
            appUser.CoverImageUrl,
            appUser.Role,
            appUser.IsActive
        };
    }

    private static void ApplyCvParseToUser(Domain.Entities.User appUser, CvParseResult parsed)
    {
        appUser.Headline = Normalize(parsed.ProfessionalHeadline);
        appUser.Bio = Normalize(parsed.TechnicalSummary);
        appUser.SkillsSummary = Normalize(parsed.Skills);
        appUser.Education = Normalize(parsed.Education);
        appUser.Languages = Normalize(parsed.Languages);
        appUser.DesiredRole = Normalize(parsed.DesiredRole);
        appUser.Company = Normalize(parsed.Company);

        if (parsed.EstimatedYearsOfExperience is >= 0 and <= 50)
        {
            appUser.YearsOfExperience = parsed.EstimatedYearsOfExperience;
        }

        var projectedOccupation = Normalize(parsed.DesiredRole);
        if (!string.IsNullOrWhiteSpace(projectedOccupation))
        {
            appUser.Occupation = projectedOccupation;
        }
    }

    private static string? ResolveClerkUserId(ClaimsPrincipal user)
    {
        return user.FindFirst("sub")?.Value
            ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? user.FindFirst("user_id")?.Value;
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
