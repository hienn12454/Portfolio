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
    public string Role { get; set; } = "User";
    public bool IsActive { get; set; } = true;
}
