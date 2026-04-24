using Portfolio.Domain.Common;

namespace Portfolio.Domain.Entities;

public sealed class PageContent : BaseAuditableEntity
{
    public string HeroTitle { get; set; } = string.Empty;
    public string HeroDescription { get; set; } = string.Empty;
    public string AboutTitle { get; set; } = string.Empty;
    public string AboutDescription { get; set; } = string.Empty;
}
