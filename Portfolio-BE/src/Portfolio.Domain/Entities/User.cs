using Portfolio.Domain.Common;

namespace Portfolio.Domain.Entities;

public sealed class User : BaseAuditableEntity
{
    public string ClerkUserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? ImageUrl { get; set; }
    public string Role { get; set; } = "User";
    public bool IsActive { get; set; } = true;
}
