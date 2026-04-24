using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Portfolio.Application.Abstractions;
using Portfolio.Domain.Entities;

namespace Portfolio.Api.Controllers;

[ApiController]
[Route("api/skills")]
public sealed class SkillsController(IApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetVisible(CancellationToken cancellationToken)
    {
        var skills = await dbContext.Skills
            .AsNoTracking()
            .Where(x => x.IsVisible)
            .OrderBy(x => x.DisplayOrder)
            .ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);

        return Ok(skills);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpGet("admin")]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var skills = await dbContext.Skills
            .AsNoTracking()
            .OrderBy(x => x.DisplayOrder)
            .ThenBy(x => x.Name)
            .ToListAsync(cancellationToken);

        return Ok(skills);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Skill request, CancellationToken cancellationToken)
    {
        request.Id = Guid.NewGuid();
        dbContext.Skills.Add(request);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(request);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Skill request, CancellationToken cancellationToken)
    {
        var skill = await dbContext.Skills.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (skill is null)
        {
            return NotFound();
        }

        skill.Name = request.Name;
        skill.Description = request.Description;
        skill.DisplayOrder = request.DisplayOrder;
        skill.IsVisible = request.IsVisible;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(skill);
    }

    [Authorize(Policy = "AdminOnly")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var skill = await dbContext.Skills.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (skill is null)
        {
            return NotFound();
        }

        dbContext.Skills.Remove(skill);
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
