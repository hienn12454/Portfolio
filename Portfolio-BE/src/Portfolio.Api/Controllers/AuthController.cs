using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using Portfolio.Application.Abstractions;
using Portfolio.Application.Features.Users;
using Portfolio.Domain.Entities;

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
                Role = ResolveRole(clerkUserId, email, username),
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

            var resolvedRole = ResolveRole(clerkUserId, email ?? appUser.Email, username, appUser.Role);
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
        var resolvedRole = ResolveRole(clerkUserId, email ?? appUser.Email, username, appUser.Role);
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

        if (!openRouterClient.IsConfigured)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { Message = "Vision AI service is not configured. Please contact the administrator." });
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
            return StatusCode(StatusCodes.Status502BadGateway,
                new { Message = "CV image could not be parsed. The AI model may be unavailable — please try again shortly." });
        }

        ApplyCvParseToUser(appUser, parsed);
        // The public /cv profile is a single, site-owner document. Only sync it from an admin's
        // own import — a regular user importing their CV must not overwrite the owner's public CV.
        if (string.Equals(appUser.Role, "Admin", StringComparison.Ordinal))
        {
            await UpsertCvProfileFromParsedAsync(appUser, parsed, cancellationToken);
        }
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

        if (!openRouterClient.IsConfigured)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { Message = "Vision AI service is not configured. Please contact the administrator." });
        }

        var appUser = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (appUser is null)
        {
            return NotFound(new { Message = "Target user not found." });
        }

        var parsed = await openRouterClient.ParseCvImageAsync(request.ImageBase64, request.FileName, cancellationToken);
        if (parsed is null)
        {
            return StatusCode(StatusCodes.Status502BadGateway,
                new { Message = "CV image could not be parsed. The AI model may be unavailable — please try again shortly." });
        }

        ApplyCvParseToUser(appUser, parsed);
        await UpsertCvProfileFromParsedAsync(appUser, parsed, cancellationToken);
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

    /// <summary>
    /// After a successful CV image import, also sync the CvProfile (public /cv page)
    /// so that structured CV data and the user profile stay in sync.
    /// Personal fields (FullName, Email) are only filled in when currently blank to avoid
    /// overwriting hand-crafted data.  JobTitle, Summary, skills, and languages are always
    /// updated from the fresh parse result.
    /// </summary>
    private async Task UpsertCvProfileFromParsedAsync(
        Domain.Entities.User appUser,
        CvParseResult parsed,
        CancellationToken cancellationToken)
    {
        var profile = await dbContext.CvProfiles
            .OrderByDescending(x => x.UpdatedAtUtc)
            .ThenByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (profile is null)
        {
            profile = new CvProfile { Id = Guid.NewGuid() };
            dbContext.CvProfiles.Add(profile);
        }

        // Blank personal fields — only fill when not yet set
        if (string.IsNullOrWhiteSpace(profile.FullName))
        {
            var displayName = Normalize(appUser.DisplayName)
                ?? Normalize($"{appUser.FirstName} {appUser.LastName}".Trim());
            if (!string.IsNullOrWhiteSpace(displayName))
                profile.FullName = displayName;
        }

        if (string.IsNullOrWhiteSpace(profile.Email) && !string.IsNullOrWhiteSpace(appUser.Email))
            profile.Email = appUser.Email;

        // Always overwrite content fields from fresh parse
        if (!string.IsNullOrWhiteSpace(parsed.ProfessionalHeadline))
            profile.JobTitle = parsed.ProfessionalHeadline;

        if (!string.IsNullOrWhiteSpace(parsed.TechnicalSummary))
            profile.Summary = parsed.TechnicalSummary;

        // Convert "Skill A, Skill B, ..." → SkillGroupsJson
        if (!string.IsNullOrWhiteSpace(parsed.Skills))
        {
            var skillItems = parsed.Skills
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Take(30)
                .Select(s => new { name = s, level = 75 })
                .ToArray();

            profile.SkillGroupsJson = JsonSerializer.Serialize(new[]
            {
                new
                {
                    id = Guid.NewGuid().ToString("N"),
                    category = "Technical Skills",
                    items = skillItems
                }
            });
        }

        // Convert "English, Vietnamese, ..." → LanguagesJson
        if (!string.IsNullOrWhiteSpace(parsed.Languages))
        {
            var langItems = parsed.Languages
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Take(10)
                .Select(l => new { language = l, proficiency = "intermediate" })
                .ToArray();

            profile.LanguagesJson = JsonSerializer.Serialize(langItems);
        }
    }

    private static string? ResolveClerkUserId(ClaimsPrincipal user)
    {
        return user.FindFirst("sub")?.Value
            ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? user.FindFirst("user_id")?.Value;
    }

    private string ResolveRole(string clerkUserId, string? email, string? username, string? currentRole = null)
    {
        if (string.Equals(currentRole, "Admin", StringComparison.Ordinal))
        {
            return "Admin";
        }

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

        var adminEmails = configuration["Clerk:AdminEmails"];
        if (!string.IsNullOrWhiteSpace(email) && !string.IsNullOrWhiteSpace(adminEmails))
        {
            var isAdminEmail = adminEmails
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Any(x => string.Equals(x, email, StringComparison.OrdinalIgnoreCase));
            if (isAdminEmail)
            {
                return "Admin";
            }
        }

        // SECURITY: usernames are user-controllable in Clerk, so never grant admin from a
        // hard-coded default. Only honour an explicitly configured allow-list.
        var adminUsernames = configuration["Clerk:AdminUsernames"];
        if (!string.IsNullOrWhiteSpace(adminUsernames) && !string.IsNullOrWhiteSpace(username))
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
