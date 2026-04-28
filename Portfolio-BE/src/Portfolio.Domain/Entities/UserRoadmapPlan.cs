using Portfolio.Domain.Common;

namespace Portfolio.Domain.Entities;

public sealed class UserRoadmapPlan : BaseAuditableEntity
{
    public Guid UserId { get; set; }
    public string Track { get; set; } = "it";
    public string Specialty { get; set; } = string.Empty;
    public string SourceRoadmapSlug { get; set; } = string.Empty;
    public string PlanMarkdown { get; set; } = string.Empty;
    public string DailyTechnical { get; set; } = string.Empty;
    public DateOnly DailyForDate { get; set; }
}
