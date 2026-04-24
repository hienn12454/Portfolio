using Portfolio.Domain.Common;

namespace Portfolio.Domain.Entities;

public sealed class ContactInfo : BaseAuditableEntity
{
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Location { get; set; }
    public string? GithubUrl { get; set; }
    public string? LinkedInUrl { get; set; }
}
