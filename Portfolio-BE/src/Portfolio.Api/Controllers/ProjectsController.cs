using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Portfolio.Application.Abstractions;
using Portfolio.Domain.Entities;

namespace Portfolio.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class ProjectsController(IApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<Project>>> GetAll(CancellationToken cancellationToken)
    {
        var projects = await dbContext.Projects
            .AsNoTracking()
            .OrderByDescending(x => x.IsFeatured)
            .ThenBy(x => x.Title)
            .ToListAsync(cancellationToken);

        return Ok(projects);
    }

    [HttpPost("{id:guid}/like")]
    public async Task<IActionResult> Like(Guid id, CancellationToken cancellationToken)
    {
        var project = await dbContext.Projects.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (project is null)
        {
            return NotFound();
        }

        try
        {
            // Atomic DB-side increment avoids lost updates when many anonymous requests race.
            await dbContext.Projects
                .Where(x => x.Id == id)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.LikeCount, p => p.LikeCount + 1), cancellationToken);
            return Ok(new { project.Id, LikeCount = project.LikeCount + 1, project.ViewCount });
        }
        catch (Exception ex) when (ex is InvalidOperationException or NotSupportedException)
        {
            // Providers without ExecuteUpdate support (e.g. EF InMemory in tests): fall back to read-modify-write.
            project.LikeCount += 1;
            await dbContext.SaveChangesAsync(cancellationToken);
            return Ok(new { project.Id, project.LikeCount, project.ViewCount });
        }
    }

    [HttpPost("{id:guid}/view")]
    public async Task<IActionResult> View(Guid id, CancellationToken cancellationToken)
    {
        var project = await dbContext.Projects.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (project is null)
        {
            return NotFound();
        }

        try
        {
            // Atomic DB-side increment avoids lost updates when many anonymous requests race.
            await dbContext.Projects
                .Where(x => x.Id == id)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.ViewCount, p => p.ViewCount + 1), cancellationToken);
            return Ok(new { project.Id, project.LikeCount, ViewCount = project.ViewCount + 1 });
        }
        catch (Exception ex) when (ex is InvalidOperationException or NotSupportedException)
        {
            // Providers without ExecuteUpdate support (e.g. EF InMemory in tests): fall back to read-modify-write.
            project.ViewCount += 1;
            await dbContext.SaveChangesAsync(cancellationToken);
            return Ok(new { project.Id, project.LikeCount, project.ViewCount });
        }
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Project request, CancellationToken cancellationToken)
    {
        request.Id = Guid.NewGuid();
        dbContext.Projects.Add(request);
        await dbContext.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(GetAll), new { id = request.Id }, request);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Project request, CancellationToken cancellationToken)
    {
        var project = await dbContext.Projects.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (project is null)
        {
            return NotFound();
        }

        project.Title = request.Title;
        project.Slug = request.Slug;
        project.Category = request.Category;
        project.Role = request.Role;
        project.Summary = request.Summary;
        project.Stack = request.Stack;
        project.CaseStudy = request.CaseStudy;
        project.Impact = request.Impact;
        project.RepositoryUrl = request.RepositoryUrl;
        project.DemoUrl = request.DemoUrl;
        project.IsFeatured = request.IsFeatured;

        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(project);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var project = await dbContext.Projects.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (project is null)
        {
            return NotFound();
        }

        dbContext.Projects.Remove(project);
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
