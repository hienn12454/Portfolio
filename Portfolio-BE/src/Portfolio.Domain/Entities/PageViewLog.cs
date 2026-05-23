using Portfolio.Domain.Common;

namespace Portfolio.Domain.Entities;

public sealed class PageViewLog : BaseAuditableEntity
{
    public string Path { get; set; } = string.Empty;
    public string? Referrer { get; set; }
    public DateTime ViewedAtUtc { get; set; }
}
