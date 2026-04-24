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
            dbContext.PageContents.Add(request);
            await dbContext.SaveChangesAsync(cancellationToken);
            return Ok(request);
        }

        page.HeroTitle = request.HeroTitle;
        page.HeroDescription = request.HeroDescription;
        page.AboutTitle = request.AboutTitle;
        page.AboutDescription = request.AboutDescription;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(page);
    }
}
