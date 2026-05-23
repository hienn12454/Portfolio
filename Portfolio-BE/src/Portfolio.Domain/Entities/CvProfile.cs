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
}
