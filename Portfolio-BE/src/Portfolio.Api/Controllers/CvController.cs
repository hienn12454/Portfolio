using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Portfolio.Application.Abstractions;
using Portfolio.Domain.Entities;

namespace Portfolio.Api.Controllers;

[ApiController]
[Route("api/cv")]
public sealed class CvController(IApplicationDbContext dbContext) : ControllerBase
{
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
        var existing = await dbContext.CvProfiles
            .OrderByDescending(x => x.UpdatedAtUtc)
            .ThenByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (existing is null)
        {
            request.Id = Guid.NewGuid();
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
        existing.AccentColor = request.AccentColor;
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
