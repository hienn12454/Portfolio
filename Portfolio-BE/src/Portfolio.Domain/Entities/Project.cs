using Portfolio.Domain.Common;

namespace Portfolio.Domain.Entities;

public sealed class Project : BaseAuditableEntity
{
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Category { get; set; } = "fullstack";
    public string? Role { get; set; }
    public string? Summary { get; set; }
    public string? Stack { get; set; }
    public string? CaseStudy { get; set; }
    public string? Impact { get; set; }
    public string? RepositoryUrl { get; set; }
    public string? DemoUrl { get; set; }
    public bool IsFeatured { get; set; }
}
