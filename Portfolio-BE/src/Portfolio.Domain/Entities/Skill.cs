using Portfolio.Domain.Common;

namespace Portfolio.Domain.Entities;

public sealed class Skill : BaseAuditableEntity
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsVisible { get; set; } = true;
}
