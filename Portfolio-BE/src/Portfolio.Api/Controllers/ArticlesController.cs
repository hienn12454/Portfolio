using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Portfolio.Application.Abstractions;
using Portfolio.Domain.Entities;

namespace Portfolio.Api.Controllers;

[ApiController]
[Route("api/articles")]
public sealed class ArticlesController(IApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetPublished(CancellationToken cancellationToken)
    {
        var articles = await dbContext.Articles
            .AsNoTracking()
            .Where(x => x.IsPublished)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return Ok(articles);
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug(string slug, CancellationToken cancellationToken)
    {
        var article = await dbContext.Articles
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Slug == slug && x.IsPublished, cancellationToken);

        return article is null ? NotFound() : Ok(article);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpGet("admin")]
    public async Task<IActionResult> GetAllForAdmin(CancellationToken cancellationToken)
    {
        var articles = await dbContext.Articles
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return Ok(articles);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Article request, CancellationToken cancellationToken)
    {
        request.Id = Guid.NewGuid();
        dbContext.Articles.Add(request);
        await dbContext.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetBySlug), new { slug = request.Slug }, request);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Article request, CancellationToken cancellationToken)
    {
        var article = await dbContext.Articles.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (article is null)
        {
            return NotFound();
        }

        article.Title = request.Title;
        article.Slug = request.Slug;
        article.Summary = request.Summary;
        article.Content = request.Content;
        article.IsPublished = request.IsPublished;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(article);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var article = await dbContext.Articles.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (article is null)
        {
            return NotFound();
        }

        dbContext.Articles.Remove(article);
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
