using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Portfolio.Application.Abstractions;
using Portfolio.Domain.Entities;

namespace Portfolio.Api.Controllers;

[ApiController]
[Route("api/content")]
public sealed class ContentController(IApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet("contact")]
    public async Task<IActionResult> GetContact(CancellationToken cancellationToken)
    {
        var contact = await dbContext.ContactInfos
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        return Ok(contact);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPut("contact")]
    public async Task<IActionResult> UpsertContact([FromBody] ContactInfo request, CancellationToken cancellationToken)
    {
        var contact = await dbContext.ContactInfos.FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);
        if (contact is null)
        {
            request.Id = request.Id == Guid.Empty ? Guid.NewGuid() : request.Id;
            dbContext.ContactInfos.Add(request);
            await dbContext.SaveChangesAsync(cancellationToken);
            return Ok(request);
        }

        contact.Email = request.Email;
        contact.Phone = request.Phone;
        contact.Location = request.Location;
        contact.GithubUrl = request.GithubUrl;
        contact.LinkedInUrl = request.LinkedInUrl;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(contact);
    }

    [HttpGet("page")]
    public async Task<IActionResult> GetPageContent(CancellationToken cancellationToken)
    {
        var page = await dbContext.PageContents
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        return Ok(page);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPut("page")]
    public async Task<IActionResult> UpsertPageContent([FromBody] PageContent request, CancellationToken cancellationToken)
    {
        var page = await dbContext.PageContents.FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);
        if (page is null)
        {
            request.Id = request.Id == Guid.Empty ? Guid.NewGuid() : request.Id;
            request.HeroTitleColor = NormalizeColor(request.HeroTitleColor);
            request.HeroDescriptionColor = NormalizeColor(request.HeroDescriptionColor);
            request.HeroTypingSpeedMs = Math.Clamp(request.HeroTypingSpeedMs, 10, 120);
            request.AboutTitleColor = NormalizeColor(request.AboutTitleColor);
            request.AboutDescriptionColor = NormalizeColor(request.AboutDescriptionColor);
            request.SkillsTitleColor = NormalizeColor(request.SkillsTitleColor);
            request.SkillsDescriptionColor = NormalizeColor(request.SkillsDescriptionColor);
            request.ProjectsTitleColor = NormalizeColor(request.ProjectsTitleColor);
            request.ProjectsDescriptionColor = NormalizeColor(request.ProjectsDescriptionColor);
            request.ContactTitleColor = NormalizeColor(request.ContactTitleColor);
            request.ContactDescriptionColor = NormalizeColor(request.ContactDescriptionColor);
            dbContext.PageContents.Add(request);
            await dbContext.SaveChangesAsync(cancellationToken);
            return Ok(request);
        }

        page.HeroTitle = request.HeroTitle;
        page.HeroDescription = request.HeroDescription;
        page.AboutTitle = request.AboutTitle;
        page.AboutDescription = request.AboutDescription;
        page.HeroTitleColor = NormalizeColor(request.HeroTitleColor);
        page.HeroDescriptionColor = NormalizeColor(request.HeroDescriptionColor);
        page.HeroTypingSpeedMs = Math.Clamp(request.HeroTypingSpeedMs, 10, 120);
        page.AboutTitleColor = NormalizeColor(request.AboutTitleColor);
        page.AboutDescriptionColor = NormalizeColor(request.AboutDescriptionColor);
        page.SkillsTitleColor = NormalizeColor(request.SkillsTitleColor);
        page.SkillsDescriptionColor = NormalizeColor(request.SkillsDescriptionColor);
        page.ProjectsTitleColor = NormalizeColor(request.ProjectsTitleColor);
        page.ProjectsDescriptionColor = NormalizeColor(request.ProjectsDescriptionColor);
        page.ContactTitleColor = NormalizeColor(request.ContactTitleColor);
        page.ContactDescriptionColor = NormalizeColor(request.ContactDescriptionColor);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(page);
    }

    private static string? NormalizeColor(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }
}
