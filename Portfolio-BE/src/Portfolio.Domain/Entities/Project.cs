using Portfolio.Domain.Common;

namespace Portfolio.Domain.Entities;

public sealed class Project : BaseAuditableEntity
{
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public string? RepositoryUrl { get; set; }
    public string? DemoUrl { get; set; }
    public bool IsFeatured { get; set; }
}
