using Portfolio.Domain.Common;

namespace Portfolio.Domain.Entities;

public sealed class CvProfile : BaseAuditableEntity
{
    public string? FullName { get; set; }
    public string? JobTitle { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public string? AvatarUrl { get; set; }
    public string? WebsiteUrl { get; set; }
    public string? GithubUrl { get; set; }
    public string? LinkedInUrl { get; set; }
    public string? Summary { get; set; }

    // JSON-stored arrays for flexible structured data
    public string? WorkExperiencesJson { get; set; }
    public string? EducationsJson { get; set; }
    public string? SkillGroupsJson { get; set; }
    public string? CertificationsJson { get; set; }
    public string? LanguagesJson { get; set; }
    public string? AwardsJson { get; set; }
    public string? HobbiesJson { get; set; }

    public bool IsPublic { get; set; } = true;
    public string AccentColor { get; set; } = "#2563eb";

    // Template selection ("classic" | "modern" | "compact") — server-driven default so every
    // visitor sees the admin's chosen template; visitors may still override it locally.
    public string Template { get; set; } = "classic";

    // Ordered visibility list for reorderable main-content sections, e.g.
    // [{"key":"work","visible":true},{"key":"education","visible":true},{"key":"awards","visible":true}]
    // Null = default order, all visible.
    public string? SectionOrderJson { get; set; }

    // Public page-view counter — server-managed, incremented via POST /api/cv/view.
    public int ViewCount { get; set; }
}
