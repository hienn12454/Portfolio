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
}
