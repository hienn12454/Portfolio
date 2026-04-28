using Portfolio.Domain.Common;

namespace Portfolio.Domain.Entities;

public sealed class PageContent : BaseAuditableEntity
{
    public string HeroTitle { get; set; } = string.Empty;
    public string HeroDescription { get; set; } = string.Empty;
    public string AboutTitle { get; set; } = string.Empty;
    public string AboutDescription { get; set; } = string.Empty;
    public string? HeroTitleColor { get; set; }
    public string? HeroDescriptionColor { get; set; }
    public int HeroTypingSpeedMs { get; set; } = 28;
    public string? AboutTitleColor { get; set; }
    public string? AboutDescriptionColor { get; set; }
    public string? SkillsTitleColor { get; set; }
    public string? SkillsDescriptionColor { get; set; }
    public string? ProjectsTitleColor { get; set; }
    public string? ProjectsDescriptionColor { get; set; }
    public string? ContactTitleColor { get; set; }
    public string? ContactDescriptionColor { get; set; }
}
