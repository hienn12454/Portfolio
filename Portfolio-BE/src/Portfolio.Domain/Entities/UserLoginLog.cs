using Portfolio.Domain.Common;

namespace Portfolio.Domain.Entities;

public sealed class UserLoginLog : BaseAuditableEntity
{
    public Guid UserId { get; set; }
    public string ClerkUserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public DateTime LoggedInAtUtc { get; set; }
}
