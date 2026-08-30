using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Portfolio.Application.Abstractions;
using Portfolio.Domain.Entities;
using System.Text.RegularExpressions;

namespace Portfolio.Api.Controllers;

[ApiController]
[Route("api/cv")]
public sealed class CvController(IApplicationDbContext dbContext) : ControllerBase
{
    // Vietnamese mobile/landline: 0xxxxxxxxx (10 digits) or +84xxxxxxxxx (9-10 digits).
    // Separators (space/dash/dot) are stripped before matching.
    private static readonly Regex PhoneRegex = new(@"^(0\d{9,10}|\+84\d{9,10})$", RegexOptions.Compiled);
    private static readonly Regex EmailRegex = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);
    private static readonly Regex HexColorRegex = new(@"^#[0-9A-Fa-f]{6}$", RegexOptions.Compiled);
    private static readonly HashSet<string> AllowedTemplates = new(StringComparer.OrdinalIgnoreCase) { "classic", "modern", "compact" };

    /// <summary>
    /// Validates a CV profile submission and returns a Vietnamese, user-facing error message
    /// for the first problem found, or null when everything is valid.
    /// </summary>
    private static string? ValidateCvProfile(CvProfile request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return "Vui lòng nhập họ và tên.";
        }
        if (request.FullName.Trim().Length > 150)
        {
            return "Họ và tên không được vượt quá 150 ký tự.";
        }

        if (!string.IsNullOrWhiteSpace(request.JobTitle) && request.JobTitle.Trim().Length > 150)
        {
            return "Chức danh không được vượt quá 150 ký tự.";
        }

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var email = request.Email.Trim();
            if (email.Length > 254 || !EmailRegex.IsMatch(email))
            {
                return "Email không hợp lệ. Vui lòng nhập đúng định dạng (vd: ten@example.com).";
            }
        }

        if (!string.IsNullOrWhiteSpace(request.Phone))
        {
            var digitsOnly = Regex.Replace(request.Phone.Trim(), @"[\s\-.]", "");
            if (!PhoneRegex.IsMatch(digitsOnly))
            {
                return "Số điện thoại không hợp lệ. Vui lòng nhập số Việt Nam (vd: 0912345678 hoặc +84912345678).";
            }
        }

        if (!string.IsNullOrWhiteSpace(request.Address) && request.Address.Trim().Length > 300)
        {
            return "Địa chỉ không được vượt quá 300 ký tự.";
        }

        if (!string.IsNullOrWhiteSpace(request.AccentColor) && !HexColorRegex.IsMatch(request.AccentColor.Trim()))
        {
            return "Màu chủ đạo không hợp lệ. Vui lòng chọn mã màu dạng #RRGGBB.";
        }

        if (!string.IsNullOrWhiteSpace(request.Template) && !AllowedTemplates.Contains(request.Template.Trim()))
        {
            return "Mẫu CV không hợp lệ.";
        }

        foreach (var (url, label) in new[] { (request.WebsiteUrl, "Website"), (request.GithubUrl, "GitHub"), (request.LinkedInUrl, "LinkedIn") })
        {
            if (!string.IsNullOrWhiteSpace(url) && !url.StartsWith("http://") && !url.StartsWith("https://"))
            {
                return $"Đường dẫn {label} phải bắt đầu bằng http:// hoặc https://.";
            }
        }

        return null;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var cv = await dbContext.CvProfiles
            .AsNoTracking()
            .Where(x => x.IsPublic)
            .OrderByDescending(x => x.UpdatedAtUtc)
            .ThenByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (cv is null)
        {
            return Ok(null);
        }

        return Ok(cv);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpGet("admin")]
    public async Task<IActionResult> GetAdmin(CancellationToken cancellationToken)
    {
        var cv = await dbContext.CvProfiles
            .AsNoTracking()
            .OrderByDescending(x => x.UpdatedAtUtc)
            .ThenByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        return Ok(cv);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPut]
    public async Task<IActionResult> Upsert([FromBody] CvProfile request, CancellationToken cancellationToken)
    {
        var validationError = ValidateCvProfile(request);
        if (validationError is not null)
        {
            return BadRequest(new { Message = validationError });
        }

        var existing = await dbContext.CvProfiles
            .OrderByDescending(x => x.UpdatedAtUtc)
            .ThenByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (existing is null)
        {
            request.Id = Guid.NewGuid();
            if (string.IsNullOrWhiteSpace(request.AccentColor)) request.AccentColor = "#2563eb";
            if (string.IsNullOrWhiteSpace(request.Template)) request.Template = "classic";
            dbContext.CvProfiles.Add(request);
            await dbContext.SaveChangesAsync(cancellationToken);
            return Ok(request);
        }

        existing.FullName = request.FullName;
        existing.JobTitle = request.JobTitle;
        existing.Email = request.Email;
        existing.Phone = request.Phone;
        existing.Address = request.Address;
        existing.AvatarUrl = request.AvatarUrl;
        existing.WebsiteUrl = request.WebsiteUrl;
        existing.GithubUrl = request.GithubUrl;
        existing.LinkedInUrl = request.LinkedInUrl;
        existing.Summary = request.Summary;
        existing.WorkExperiencesJson = request.WorkExperiencesJson;
        existing.EducationsJson = request.EducationsJson;
        existing.SkillGroupsJson = request.SkillGroupsJson;
        existing.CertificationsJson = request.CertificationsJson;
        existing.LanguagesJson = request.LanguagesJson;
        existing.AwardsJson = request.AwardsJson;
        existing.HobbiesJson = request.HobbiesJson;
        existing.IsPublic = request.IsPublic;
        existing.AccentColor = string.IsNullOrWhiteSpace(request.AccentColor) ? "#2563eb" : request.AccentColor;
        existing.Template = string.IsNullOrWhiteSpace(request.Template) ? "classic" : request.Template;
        existing.SectionOrderJson = request.SectionOrderJson;
        // ViewCount is server-managed (see POST /api/cv/view) — never overwritten by admin edits.

        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(existing);
    }

    [HttpPost("view")]
    public async Task<IActionResult> View(CancellationToken cancellationToken)
    {
        var cv = await dbContext.CvProfiles
            .Where(x => x.IsPublic)
            .OrderByDescending(x => x.UpdatedAtUtc)
            .ThenByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (cv is null)
        {
            return NotFound();
        }

        cv.ViewCount += 1;
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(new { cv.ViewCount });
    }
}
