using Portfolio.Domain.Common;

namespace Portfolio.Domain.Entities;

public sealed class User : BaseAuditableEntity
{
    public string ClerkUserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? ImageUrl { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Address { get; set; }
    public string? Occupation { get; set; }
    public string? Headline { get; set; }
    public string? Bio { get; set; }
    public string? WebsiteUrl { get; set; }
    public string? GithubUrl { get; set; }
    public string? LinkedInUrl { get; set; }
    public string? Company { get; set; }
    public int? YearsOfExperience { get; set; }
    public string? Education { get; set; }
    public string? SkillsSummary { get; set; }
    public string? Languages { get; set; }
    public string? DesiredRole { get; set; }
    public string? CoverImageUrl { get; set; }
    public string Role { get; set; } = "User";
    public bool IsActive { get; set; } = true;
}
