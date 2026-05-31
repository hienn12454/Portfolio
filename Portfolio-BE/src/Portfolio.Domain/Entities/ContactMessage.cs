using Portfolio.Domain.Common;

namespace Portfolio.Domain.Entities;

/// <summary>A message submitted through the public contact form.</summary>
public sealed class ContactMessage : BaseAuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Subject { get; set; }
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; }
}
